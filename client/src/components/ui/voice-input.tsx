import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;  // For real-time updates
  isActive?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceInput({ onTranscript, onPartialTranscript, isActive = false, className, size = 'md' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

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
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (socketRef.current) {
      // Send terminate session message if still open
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ terminate_session: true }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }
    
    // Finalize transcript
    if (currentTranscript.trim()) {
      onTranscript(currentTranscript.trim());
    }
    setCurrentTranscript('');
    setIsListening(false);
  };

  const startRecording = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,  // AssemblyAI prefers 16khz
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      setIsListening(true);
      setError(null);
      setCurrentTranscript('');
      
      // Get WebSocket connection token from server
      const tokenResponse = await fetch('/api/voice/streaming-token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get streaming token');
      }
      const { token } = await tokenResponse.json();
      
      // Create WebSocket connection to AssemblyAI Universal-Streaming
      const socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('Connected to AssemblyAI streaming');
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Streaming message:', data);
        
        if (data.message_type === 'PartialTranscript' && data.text) {
          // Update partial transcript in real-time
          setCurrentTranscript(data.text);
          if (onPartialTranscript) {
            onPartialTranscript(data.text);
          }
        } else if (data.message_type === 'FinalTranscript' && data.text) {
          // Final transcript received
          setCurrentTranscript(data.text);
          console.log('Final transcript:', data.text);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection failed');
        stopRecording();
      };
      
      socket.onclose = () => {
        console.log('WebSocket closed');
      };
      
      // Set up audio processing to send PCM data to WebSocket
      const audioContext = new AudioContext(); // Let browser use native sample rate
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          const inputSampleRate = audioContext.sampleRate;
          const outputSampleRate = 16000;
          
          // Downsample to 16kHz if needed
          let outputBuffer = inputBuffer;
          if (inputSampleRate !== outputSampleRate) {
            const sampleRateRatio = inputSampleRate / outputSampleRate;
            const outputLength = Math.floor(inputBuffer.length / sampleRateRatio);
            outputBuffer = new Float32Array(outputLength);
            
            for (let i = 0; i < outputLength; i++) {
              const inputIndex = Math.floor(i * sampleRateRatio);
              outputBuffer[i] = inputBuffer[inputIndex];
            }
          }
          
          // Convert Float32Array to Int16Array (PCM16)
          const pcm16 = new Int16Array(outputBuffer.length);
          for (let i = 0; i < outputBuffer.length; i++) {
            const sample = Math.max(-1, Math.min(1, outputBuffer[i]));
            pcm16[i] = sample * 0x7FFF;
          }
          
          // Send as JSON message with audio_data field for AssemblyAI
          const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(pcm16.buffer))));
          socket.send(JSON.stringify({ audio_data: base64 }));
        }
      };
      
      source.connect(processor);
      // Don't connect to destination to avoid audio feedback
      
      // Let user control recording duration (removed auto-stop)
      
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
        isListening && "bg-red-500 hover:bg-red-600 text-white recording-pulse",
        error && "border-red-300 bg-red-50",
        className
      )}
      onClick={handleToggle}
      title={error ? error : (isListening ? "Stop dictation" : "Start voice dictation")}
    >
      {isListening ? (
        <Volume2 className={iconSizes[size]} />
      ) : error ? (
        <MicOff className={cn(iconSizes[size], "text-red-500")} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </Button>
  );
}