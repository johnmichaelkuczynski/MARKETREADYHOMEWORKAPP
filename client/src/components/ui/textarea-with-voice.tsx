import { forwardRef, useState } from 'react';
import { Textarea } from './textarea';
import { VoiceInput } from './voice-input';
import { Button } from './button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextareaWithVoiceProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onVoiceTranscript?: (text: string) => void;
  showVoiceButton?: boolean;
  showClearButton?: boolean;
}

const TextareaWithVoice = forwardRef<HTMLTextAreaElement, TextareaWithVoiceProps>(
  ({ className, onVoiceTranscript, showVoiceButton = true, showClearButton = true, onChange, value, ...props }, ref) => {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const handleVoiceTranscript = (transcript: string) => {
      if (onVoiceTranscript) {
        onVoiceTranscript(transcript);
      } else if (onChange) {
        // Finalize transcript by removing brackets and appending clean text
        const currentValue = String(value || '');
        const baseText = currentValue.replace(/ \[.*?\]$/, ''); // Remove partial in brackets
        const newValue = baseText + (transcript.trim() ? (baseText ? ' ' + transcript.trim() : transcript.trim()) : '');
        const event = {
          target: { value: newValue }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };

    const handlePartialTranscript = (partialText: string) => {
      // Show partial transcripts in brackets for real-time feedback
      if (onChange) {
        const currentValue = String(value || '');
        const baseText = currentValue.replace(/ \[.*?\]$/, ''); // Remove previous partial
        const newValue = baseText + (partialText.trim() ? ` [${partialText.trim()}]` : '');
        const event = {
          target: { value: newValue }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };

    const handleTranscriptionStatus = (isActive: boolean) => {
      setIsTranscribing(isActive);
      if (isActive && onChange) {
        // Show transcription message
        const currentValue = String(value || '');
        const baseText = currentValue.replace(/ \[.*?\]$/, ''); // Remove any partial text
        const newValue = baseText + ' [Transcribing...]';
        const event = {
          target: { value: newValue }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };

    const handleClear = () => {
      if (onChange) {
        const event = {
          target: { value: '' }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };

    const hasButtons = showVoiceButton || (showClearButton && value);
    const buttonCount = (showVoiceButton ? 1 : 0) + (showClearButton && value ? 1 : 0);
    const paddingRight = buttonCount === 2 ? "pr-20" : hasButtons ? "pr-12" : "";

    return (
      <div className="relative">
        <Textarea
          ref={ref}
          className={cn(paddingRight, className)}
          value={value}
          onChange={onChange}
          {...props}
        />
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {showClearButton && value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100"
              onClick={handleClear}
              title="Clear field"
            >
              <X className="w-3 h-3 text-gray-400" />
            </Button>
          )}
          {showVoiceButton && (
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              onPartialTranscript={handlePartialTranscript}
              onTranscriptionStatus={handleTranscriptionStatus}
              size="sm"
            />
          )}
        </div>
      </div>
    );
  }
);

TextareaWithVoice.displayName = "TextareaWithVoice";

export { TextareaWithVoice };