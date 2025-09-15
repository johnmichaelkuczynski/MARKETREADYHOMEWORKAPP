import { forwardRef, useState, useRef, useEffect } from 'react';
import { Textarea } from './textarea';
import { VoiceInput } from './voice-input';
import { Button } from './button';
import { X, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MathRenderer } from './math-renderer';

export interface MathTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onVoiceTranscript?: (text: string) => void;
  showVoiceButton?: boolean;
  showClearButton?: boolean;
  showMathPreview?: boolean;
}

const MathTextarea = forwardRef<HTMLTextAreaElement, MathTextareaProps>(
  ({ 
    className, 
    onVoiceTranscript, 
    showVoiceButton = true, 
    showClearButton = true, 
    showMathPreview = true,
    onChange, 
    value, 
    ...props 
  }, ref) => {
    const [showPreview, setShowPreview] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Use forwarded ref or internal ref
    const finalRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    const handleVoiceTranscript = (transcript: string) => {
      if (onVoiceTranscript) {
        onVoiceTranscript(transcript);
      } else if (onChange) {
        // Finalize transcript by removing brackets and appending clean text
        const currentValue = String(value || '');
        const baseText = currentValue.replace(/ \[.*?\]$/, ''); // Remove partial in brackets
        const newValue = baseText + (transcript.trim() ? (baseText ? ' ' + transcript.trim() : transcript.trim()) : '');
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue },
          type: 'change'
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    };

    const handlePartialTranscript = (partialText: string) => {
      // Show partial transcripts in brackets for real-time feedback
      if (onChange) {
        const currentValue = String(value || '');
        const baseText = currentValue.replace(/ \[.*?\]$/, ''); // Remove previous partial
        const newValue = baseText + (partialText.trim() ? ` [${partialText.trim()}]` : '');
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue },
          type: 'change'
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    };

    const handleTranscriptionStatus = (isActive: boolean) => {
      setIsTranscribing(isActive);
      if (isActive && onChange) {
        // Show transcription message
        const currentValue = String(value || '');
        const baseText = currentValue.replace(/ \[.*?\]$/, ''); // Remove any partial text
        const newValue = baseText + ' [Transcribing...]';
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue },
          type: 'change'
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
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

    const hasButtons = showVoiceButton || (showClearButton && value) || showMathPreview;
    const buttonCount = (showVoiceButton ? 1 : 0) + (showClearButton && value ? 1 : 0) + (showMathPreview ? 1 : 0);
    const paddingRight = buttonCount >= 3 ? "pr-28" : buttonCount === 2 ? "pr-20" : hasButtons ? "pr-12" : "";

    // Check if content contains LaTeX math
    const hasLatexMath = typeof value === 'string' && (value.includes('$') || value.includes('\\'));

    return (
      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={finalRef}
            className={cn(paddingRight, className)}
            value={value}
            onChange={onChange}
            {...props}
          />
          
          {hasButtons && (
            <div className="absolute top-2 right-2 flex items-center space-x-1">
              {showMathPreview && hasLatexMath && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-6 w-6 p-0 hover:bg-blue-100"
                  title={showPreview ? "Hide math preview" : "Show math preview"}
                >
                  {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              )}
              
              {showClearButton && value && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                  title="Clear content"
                >
                  <X className="w-3 h-3" />
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
          )}
        </div>

        {/* Math Preview Panel */}
        {showPreview && hasLatexMath && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-blue-900">Math Preview</h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowPreview(false)}
                className="h-5 w-5 p-0 text-blue-600 hover:bg-blue-200"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="bg-white rounded border p-3">
              <MathRenderer 
                content={String(value || '')}
                className="text-sm"
              />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              This shows how your mathematical notation will appear when rendered
            </p>
          </div>
        )}
      </div>
    );
  }
);

MathTextarea.displayName = "MathTextarea";

export { MathTextarea };