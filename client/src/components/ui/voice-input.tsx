import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isActive?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceInput({ onTranscript, isActive = false, className, size = 'md' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Cleanup function
    return () => {
      stopRecording();
    };
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsListening(false);
  };

  const startRecording = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,  // Higher sample rate for better quality
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      setIsListening(true);
      setError(null);
      
      // Clear previous audio chunks
      audioChunksRef.current = [];
      
      // Set up MediaRecorder to capture audio
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      let hasAudio = false;
      
      // Set up audio level detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 10) { // Threshold for detecting audio
          hasAudio = true;
        }
      };
      
      const audioCheckInterval = setInterval(checkAudioLevel, 100);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 1000) { // Minimum size check
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        clearInterval(audioCheckInterval);
        audioContext.close();
        
        if (!hasAudio || audioChunksRef.current.length === 0) {
          setError('No speech detected. Please try again.');
          audioChunksRef.current = [];
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        // Validate minimum file size
        if (audioBlob.size < 2000) {
          setError('Recording too short. Please speak longer.');
          return;
        }
        
        // Send to server for transcription
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const response = await fetch('/api/voice/realtime-transcribe', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Transcription failed');
          }
          
          const { text } = await response.json();
          
          if (text && text.trim()) {
            console.log('Voice transcript received:', text);
            onTranscript(text.trim());
            setError(null); // Clear any previous errors
          } else {
            setError('No speech detected in recording');
          }
          
        } catch (error) {
          console.error('Transcription error:', error);
          setError(error instanceof Error ? error.message : 'Transcription failed');
        }
      };
      
      // Record for 5 seconds, then automatically stop and transcribe
      mediaRecorder.start(100); // Collect data every 100ms
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsListening(false);
        }
      }, 5000); // Increased to 5 seconds
      
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setError(error.message || 'Microphone access denied');
      setIsListening(false);
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
        "p-1 transition-all duration-200",
        isListening && "bg-red-500 hover:bg-red-600 text-white animate-pulse",
        error && "border-red-300 bg-red-50",
        className
      )}
      onClick={handleToggle}
      title={error ? error : (isListening ? "Stop dictation" : "Start voice dictation")}
    >
      {isListening ? (
        <Volume2 className={cn(iconSizes[size], "animate-pulse")} />
      ) : error ? (
        <MicOff className={cn(iconSizes[size], "text-red-500")} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </Button>
  );
}