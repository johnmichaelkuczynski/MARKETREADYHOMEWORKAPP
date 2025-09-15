import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;  // For real-time updates
  onTranscriptionStatus?: (isTranscribing: boolean) => void;  // For transcription status
  isActive?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceInput({ onTranscript, onPartialTranscript, onTranscriptionStatus, isActive = false, className, size = 'md' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [recordingState, setRecordingState] = useState<'idle' | 'listening' | 'speaking' | 'transcribing'>('idle');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentUtteranceChunks = useRef<Blob[]>([]);
  const transcriptionQueue = useRef<{ blob: Blob; sequenceId: number }[]>([]);
  const nextSequenceId = useRef(0);
  const isProcessingQueue = useRef(false);
  
  // Voice activity detection state
  const lastSpeechTime = useRef<number>(0);
  const isCurrentlySpeaking = useRef(false);
  const vadIntervalRef = useRef<number | null>(null);
  const noiseFloor = useRef<number>(0.02);
  
  // Configurable thresholds
  const SILENCE_DURATION_MS = 1300; // 1.3 seconds of silence triggers transcription
  const MIN_UTTERANCE_DURATION_MS = 600; // Minimum 0.6 seconds to be considered valid speech
  const SPEECH_THRESHOLD_MULTIPLIER = 2.5;

  useEffect(() => {
    // Check browser support
    setIsSupported(!!navigator.mediaDevices?.getUserMedia);
    
    // Cleanup function
    return () => {
      stopRecording();
    };
  }, []);

  const stopRecording = async () => {
    // Clear voice activity detection interval
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    
    // Finalize any pending utterance
    if (currentUtteranceChunks.current.length > 0) {
      await finalizeCurrentUtterance();
    }
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset state
    setIsListening(false);
    setRecordingState('idle');
    isCurrentlySpeaking.current = false;
    analyserRef.current = null;
    currentUtteranceChunks.current = [];
    transcriptionQueue.current = [];
    isProcessingQueue.current = false;
  };

  // Voice Activity Detection - monitors audio levels for speech/silence
  const startVoiceActivityDetection = () => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const dataArray = new Float32Array(analyser.fftSize);
    
    const detectVoiceActivity = () => {
      if (!analyserRef.current || !isListening) return;
      
      // Get time-domain audio data for RMS calculation
      analyser.getFloatTimeDomainData(dataArray);
      
      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      const speechThreshold = Math.max(0.02, noiseFloor.current * SPEECH_THRESHOLD_MULTIPLIER);
      const now = Date.now();
      
      if (rms > speechThreshold) {
        // Speech detected
        lastSpeechTime.current = now;
        if (!isCurrentlySpeaking.current) {
          isCurrentlySpeaking.current = true;
          setRecordingState('speaking');
        }
      } else {
        // Silence detected
        const silenceDuration = now - lastSpeechTime.current;
        
        if (isCurrentlySpeaking.current && silenceDuration >= SILENCE_DURATION_MS) {
          // Pause detected - finalize current utterance
          finalizeCurrentUtterance();
          isCurrentlySpeaking.current = false;
          setRecordingState('listening');
        }
      }
    };
    
    vadIntervalRef.current = window.setInterval(detectVoiceActivity, 100);
  };
  
  // Finalize and queue current utterance for transcription
  const finalizeCurrentUtterance = async () => {
    if (currentUtteranceChunks.current.length === 0) return;
    
    // Use the same MIME type that MediaRecorder is actually using
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const utteranceBlob = new Blob(currentUtteranceChunks.current, { type: mimeType });
    
    // Check minimum duration - be more lenient with size check for chunked audio
    if (utteranceBlob.size < 1000) {
      console.log('Utterance too small, skipping:', utteranceBlob.size, 'bytes');
      currentUtteranceChunks.current = [];
      return;
    }
    
    console.log('Finalizing utterance:', utteranceBlob.size, 'bytes,', mimeType);
    
    // Add to transcription queue with sequence ID
    const sequenceId = nextSequenceId.current++;
    transcriptionQueue.current.push({ blob: utteranceBlob, sequenceId });
    currentUtteranceChunks.current = [];
    
    // Process transcription queue (concurrency-safe)
    processTranscriptionQueue();
  };
  
  // Process queued utterances for transcription (with concurrency protection)
  const processTranscriptionQueue = async () => {
    if (transcriptionQueue.current.length === 0 || isProcessingQueue.current) return;
    
    // Prevent concurrent processing
    isProcessingQueue.current = true;
    setRecordingState('transcribing');
    onTranscriptionStatus?.(true);
    
    try {
      // Process utterances in order
      while (transcriptionQueue.current.length > 0) {
        const { blob, sequenceId } = transcriptionQueue.current.shift()!;
        
        try {
          const formData = new FormData();
          formData.append('audio', blob, `utterance-${sequenceId}.webm`);
          
          const response = await fetch('/api/voice/realtime-transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.status}`);
          }
          
          const { text } = await response.json();
          
          if (text && text.trim()) {
            console.log(`Voice transcript received (${sequenceId}):`, text);
            onTranscript(text.trim());
          }
          
        } catch (error) {
          console.error('Transcription error:', error);
          // Continue processing remaining chunks even if one fails
        }
      }
    } finally {
      // Always release the processing lock
      isProcessingQueue.current = false;
      onTranscriptionStatus?.(false);
    }
    
    // Return to listening state if still recording
    if (isListening) {
      setRecordingState(isCurrentlySpeaking.current ? 'speaking' : 'listening');
    }
  };

  const startRecording = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      // Set up audio context for voice activity detection
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512; // Good balance for VAD
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Calibrate noise floor (first 500ms)
      setTimeout(() => {
        const dataArray = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        noiseFloor.current = Math.sqrt(sum / dataArray.length);
      }, 500);
      
      // Set up continuous MediaRecorder with cross-browser compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4;codecs=mp4a.40.2';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error('Browser does not support audio recording');
          }
        }
      }
      
      console.log('Using MIME type for recording:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Received audio chunk:', event.data.size, 'bytes');
          currentUtteranceChunks.current.push(event.data);
        }
      };
      
      // Start continuous recording with 200ms timeslices
      mediaRecorder.start(200);
      
      // Initialize state
      setIsListening(true);
      setRecordingState('listening');
      setError(null);
      currentUtteranceChunks.current = [];
      transcriptionQueue.current = [];
      nextSequenceId.current = 0;
      isProcessingQueue.current = false;
      lastSpeechTime.current = Date.now();
      isCurrentlySpeaking.current = false;
      
      // Start voice activity detection
      startVoiceActivityDetection();
      
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setError(error.message || 'Microphone access denied');
      setIsListening(false);
      setRecordingState('idle');
    }
  };

  const handleToggle = useCallback(async () => {
    if (isListening) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isListening]);

  if (!isSupported) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Button
      type="button"
      variant={isListening ? "default" : "outline"}
      size="sm"
      className={cn(
        sizeClasses[size],
        "p-1 transition-all duration-200 relative",
        recordingState === 'listening' && "bg-blue-500 hover:bg-blue-600 text-white",
        recordingState === 'speaking' && "bg-green-500 hover:bg-green-600 text-white recording-pulse",
        recordingState === 'transcribing' && "bg-purple-500 hover:bg-purple-600 text-white animate-pulse",
        error && "border-red-300 bg-red-50",
        className
      )}
      onClick={handleToggle}
      title={
        error ? error :
        recordingState === 'idle' ? "Start voice dictation" :
        recordingState === 'listening' ? "Listening... (speak or click to stop)" :
        recordingState === 'speaking' ? "Speaking detected - pause to transcribe" :
        recordingState === 'transcribing' ? "Processing speech..." :
        "Voice dictation"
      }
      data-testid={`voice-input-${recordingState}`}
    >
      {recordingState === 'transcribing' ? (
        <div className={cn(iconSizes[size], "animate-spin")}>⟳</div>
      ) : error ? (
        <MicOff className={cn(iconSizes[size], "text-red-500")} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
      
      {/* Show recording state indicator */}
      {recordingState !== 'idle' && !error && (
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-current opacity-75" />
      )}
    </Button>
  );
}