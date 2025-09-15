import WebSocket from 'ws';

interface TranscriptionResult {
  text: string;
  confidence: number;
  is_final: boolean;
}

interface TranscriptionError {
  error: string;
  message: string;
}

export class AssemblyAITranscriptionService {
  private apiKey: string;
  private socket: WebSocket | null = null;
  private sampleRate: number = 16000;

  constructor() {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error('ASSEMBLYAI_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async startRealtimeTranscription(
    onTranscript: (result: TranscriptionResult) => void,
    onError: (error: TranscriptionError) => void
  ): Promise<WebSocket> {
    // Get temporary token for real-time transcription
    const tokenResponse = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'authorization': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ expires_in: 3600 }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get AssemblyAI token');
    }

    const { token } = await tokenResponse.json();

    // Create WebSocket connection
    this.socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${this.sampleRate}&token=${token}`);

    this.socket.onopen = () => {
      console.log('AssemblyAI WebSocket connection opened');
    };

    this.socket.onmessage = (message) => {
      const res = JSON.parse(message.data.toString());
      
      if (res.message_type === 'FinalTranscript' || res.message_type === 'PartialTranscript') {
        onTranscript({
          text: res.text || '',
          confidence: res.confidence || 0,
          is_final: res.message_type === 'FinalTranscript'
        });
      } else if (res.error) {
        onError({
          error: 'transcription_error',
          message: res.error
        });
      }
    };

    this.socket.onerror = (error) => {
      console.error('AssemblyAI WebSocket error:', error);
      onError({
        error: 'connection_error',
        message: 'WebSocket connection failed'
      });
    };

    this.socket.onclose = (event) => {
      console.log('AssemblyAI WebSocket connection closed:', event.code, event.reason);
    };

    return this.socket;
  }

  sendAudioData(audioData: Buffer) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(audioData);
    }
  }

  closeConnection() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Alternative: File-based transcription for uploaded audio files
  async transcribeFile(audioBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      // First, upload the audio file
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': mimeType,
        },
        body: audioBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio file');
      }

      const { upload_url } = await uploadResponse.json();

      // Then, create transcription job
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: upload_url,
          speech_model: 'universal',  // Use the new Universal model
          language_detection: true,
        }),
      });

      if (!transcriptResponse.ok) {
        throw new Error('Failed to create transcription job');
      }

      const transcript = await transcriptResponse.json();
      
      // Poll for completion
      return await this.pollTranscriptionResult(transcript.id);
    } catch (error) {
      console.error('AssemblyAI file transcription error:', error);
      throw error;
    }
  }

  private async pollTranscriptionResult(transcriptId: string): Promise<string> {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get transcription status');
      }

      const result = await response.json();

      if (result.status === 'completed') {
        return result.text || '';
      } else if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`);
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Transcription timeout');
  }
}