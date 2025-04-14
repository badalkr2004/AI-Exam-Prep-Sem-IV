import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import { MarkdownWithMath } from '../utils/MarkdownWithMath';

interface PodcastPlayerProps {
  title: string;
  subject: string;
  transcript: string;
  audioUrl?: string;
  durationSeconds?: number;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  title,
  subject,
  transcript,
  audioUrl,
  durationSeconds = 600, // Default 10 minutes
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showTranscript, setShowTranscript] = useState(false);
  const [textSegments, setTextSegments] = useState<string[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [playbackError, setPlaybackError] = useState('');
  const [currentSegment, setCurrentSegment] = useState(0);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const seekingRef = useRef<boolean>(false);
  const attemptingRestart = useRef<boolean>(false);
  
  // Detection for audio source
  const usingSpeechSynthesis = !audioUrl;

  // Clean transcript text for speech synthesis and split into segments
  useEffect(() => {
    if (transcript) {
      const text = transcript
        .replace(/\$\$(.*?)\$\$/g, '')
        .replace(/\$(.*?)\$/g, '')
        .replace(/#+\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/```.*?```/gs, '')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\n+/g, ' ')
        .trim();
      
      // Split text into segments for better control
      const words = text.split(/\s+/);
      const wordsPerSegment = 100; // About 30-40 seconds of speech per segment
      const segments = [];
      
      for (let i = 0; i < words.length; i += wordsPerSegment) {
        segments.push(words.slice(i, i + wordsPerSegment).join(' '));
      }
      
      setTextSegments(segments);
    }
  }, [transcript]);

  // Initialize speech synthesis and load voices
  useEffect(() => {
    if (!usingSpeechSynthesis) return;
    
    const initSpeechSynthesis = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthRef.current = window.speechSynthesis;

        // Force stop any ongoing speech
        speechSynthRef.current.cancel();
        
        // Load available voices
        const loadVoices = () => {
          try {
            const availableVoices = speechSynthRef.current?.getVoices() || [];
            
            // Filter for English voices
            const englishVoices = availableVoices.filter(voice => 
              voice.lang.includes('en')
            );
            
            if (englishVoices.length > 0) {
              setVoices(englishVoices);
              
              // Try to find an Indian English voice
              const indianVoiceIndex = englishVoices.findIndex(voice => 
                (voice.name.includes('Indian') || voice.name.includes('Hindi')) && 
                voice.lang.includes('en')
              );
              
              if (indianVoiceIndex >= 0) {
                setVoiceIndex(indianVoiceIndex);
              } else {
                // Fallback to first English voice
                setVoiceIndex(0);
              }
              
              setLoadingVoices(false);
            }
          } catch (error) {
            console.error('Error loading voices:', error);
            setLoadingVoices(false);
          }
        };
        
        // Chrome loads voices asynchronously
        if (speechSynthRef.current.onvoiceschanged !== undefined) {
          speechSynthRef.current.onvoiceschanged = loadVoices;
        }
        
        // Initial load attempt
        loadVoices();
        
        // Additional attempts for browsers like Firefox or Safari
        setTimeout(loadVoices, 500);
        setTimeout(loadVoices, 1000);
      }
    };
    
    initSpeechSynthesis();
    
    return () => {
      // Clean up
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
      
      // Clear any timers
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [usingSpeechSynthesis]);

  // Add an effect to update time continuously
  useEffect(() => {
    // Only create timer if we're playing with speech synthesis
    if (isPlaying && usingSpeechSynthesis) {
      if (!progressTimerRef.current) {
        startProgressTimer();
      }
    } else if (progressTimerRef.current) {
      // Clear timer when not playing
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isPlaying, usingSpeechSynthesis]);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Find the appropriate segment and position for a given time
  const findSegmentForTime = (timeInSeconds: number): { segmentIndex: number, offset: number } => {
    if (textSegments.length === 0) return { segmentIndex: 0, offset: 0 };
    
    const segmentDuration = durationSeconds / textSegments.length;
    const segmentIndex = Math.min(
      Math.floor(timeInSeconds / segmentDuration),
      textSegments.length - 1
    );
    
    return { 
      segmentIndex, 
      offset: timeInSeconds - (segmentIndex * segmentDuration)
    };
  };

  // Start speech synthesis from the current segment
  const speakCurrentSegment = () => {
    if (!speechSynthRef.current || textSegments.length === 0 || voices.length === 0) {
      setPlaybackError('Speech synthesis not available or content is empty');
      return false;
    }
    
    try {
      // Cancel any ongoing speech
      speechSynthRef.current.cancel();
      
      // Get the current segment
      const segmentText = textSegments[currentSegment];
      if (!segmentText) {
        console.error('No text found for segment', currentSegment);
        return false;
      }
      
      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(segmentText);
      utteranceRef.current = utterance;
      
      // Set voice
      const selectedVoice = voices[voiceIndex];
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for segment ${currentSegment + 1}/${textSegments.length}`);
      }
      
      // Set speech properties
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.1; // Slightly higher pitch for Indian English
      utterance.volume = volume;
      
      // Add event handlers
      utterance.onend = () => {
        // Move to next segment if available
        if (currentSegment < textSegments.length - 1) {
          setCurrentSegment(prev => prev + 1);
          speakCurrentSegment();
        } else {
          // End of podcast
          setIsPlaying(false);
          setCurrentTime(durationSeconds);
          pausedTimeRef.current = 0;
          if (progressTimerRef.current) {
            window.clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
        }
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        
        // Handle "interrupted" error differently - it's often just the user pausing
        if (event.error === 'interrupted') {
          console.log('Speech was interrupted (likely paused)');
        } else {
          setPlaybackError(`Error during playback: ${event.error}`);
          setIsPlaying(false);
          if (progressTimerRef.current) {
            window.clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
        }
      };
      
      // Reset timing references if not seeking
      if (!seekingRef.current && !attemptingRestart.current) {
        startTimeRef.current = Date.now();
      }
      
      // Start speaking
      speechSynthRef.current.speak(utterance);
      attemptingRestart.current = false;
      
      return true;
    } catch (error) {
      console.error('Error starting speech:', error);
      setPlaybackError(`Failed to start playback: ${error}`);
      return false;
    }
  };

  // Start progress timer for speech synthesis
  const startProgressTimer = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    // Use a stable reference time when starting
    const timerStartTime = Date.now();
    const timerStartPosition = pausedTimeRef.current;
    
    progressTimerRef.current = window.setInterval(() => {
      if (!seekingRef.current) {
        // Calculate based on the stable reference points
        const elapsed = (Date.now() - timerStartTime) / 1000;
        const totalProgress = timerStartPosition + elapsed;
        
        // Don't exceed total duration
        if (totalProgress < durationSeconds) {
          setCurrentTime(totalProgress);
        } else {
          setCurrentTime(durationSeconds);
          setIsPlaying(false);
          if (progressTimerRef.current) {
            window.clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
        }
      }
    }, 50); // More frequent updates for smoother progress
  };

  // Handle play/pause
  const togglePlayPause = () => {
    setPlaybackError('');
    
    if (usingSpeechSynthesis) {
      if (isPlaying) {
        // Pause speech
        if (speechSynthRef.current) {
          try {
            // Save current position
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            pausedTimeRef.current += elapsed;
            
            // Pause speech
            speechSynthRef.current.cancel(); // Full stop for now since pause() is buggy
            
            // Clear progress timer
            if (progressTimerRef.current) {
              window.clearInterval(progressTimerRef.current);
              progressTimerRef.current = null;
            }
            
            setIsPlaying(false);
          } catch (error) {
            console.error('Error pausing speech:', error);
            setPlaybackError(`Failed to pause: ${error}`);
          }
        }
      } else {
        // Start or resume speech
        if (currentTime >= durationSeconds) {
          // If at the end, start from beginning
          pausedTimeRef.current = 0;
          setCurrentTime(0);
          setCurrentSegment(0);
        } else {
          // Calculate which segment we should be at
          const { segmentIndex } = findSegmentForTime(currentTime);
          setCurrentSegment(segmentIndex);
          // Continue from current time
          pausedTimeRef.current = currentTime;
        }
        
        const success = speakCurrentSegment();
        if (success) {
          setIsPlaying(true);
        }
      }
    } else if (audioRef.current) {
      // Handle HTML audio element
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play()
            .catch(error => {
              console.error('Error playing audio:', error);
              setPlaybackError(`Failed to play audio: ${error.message}`);
            });
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Audio playback error:', error);
        setPlaybackError(`Audio playback error: ${error}`);
      }
    }
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seekingRef.current = true;
    setCurrentTime(newTime);
  };

  // Handle seek complete
  const handleSeekComplete = () => {
    try {
      if (usingSpeechSynthesis) {
        // Store the new position
        pausedTimeRef.current = currentTime;
        
        // Calculate which segment we should be at
        const { segmentIndex } = findSegmentForTime(currentTime);
        setCurrentSegment(segmentIndex);
        
        // If currently playing, restart from new position
        if (isPlaying) {
          // Cancel current speech
          if (speechSynthRef.current) {
            speechSynthRef.current.cancel();
          }
          
          // Reset timer references
          startTimeRef.current = Date.now();
          
          // Flag that we're attempting a restart (prevents double time reset)
          attemptingRestart.current = true;
          
          // Small timeout to ensure the UI updates before restarting speech
          setTimeout(() => {
            speakCurrentSegment();
            seekingRef.current = false;
          }, 50);
        } else {
          seekingRef.current = false;
        }
      } else if (audioRef.current) {
        // Update HTML audio position
        audioRef.current.currentTime = currentTime;
        seekingRef.current = false;
      }
    } catch (error) {
      console.error('Error during seek operation:', error);
      setPlaybackError('Failed to seek to that position. Try pausing first.');
      seekingRef.current = false;
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    // Update HTML audio volume
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    
    // Update speech synthesis volume
    if (utteranceRef.current) {
      utteranceRef.current.volume = newVolume;
    }
    
    // If using speech synthesis and playing, update current utterance
    if (usingSpeechSynthesis && isPlaying && speechSynthRef.current && utteranceRef.current) {
      utteranceRef.current.volume = newVolume;
    }
  };

  // Handle voice change
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIndex = parseInt(e.target.value, 10);
    setVoiceIndex(newIndex);
    
    // If currently playing, restart with new voice
    if (usingSpeechSynthesis && isPlaying && speechSynthRef.current) {
      // Store current position
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      pausedTimeRef.current += elapsed;
      
      // Restart with new voice
      speechSynthRef.current.cancel();
      setTimeout(() => {
        startTimeRef.current = Date.now();
        speakCurrentSegment();
      }, 50);
    }
  };
  
  // Reset player
  const resetPlayer = () => {
    // Stop any ongoing speech
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }
    
    // Clear timers
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    // Reset state
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentSegment(0);
    pausedTimeRef.current = 0;
    setPlaybackError('');
    seekingRef.current = false;
    
    // Reset audio element
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Generate AI voice if no audio URL provided
  const handleGenerateAudio = () => {
    setPlaybackError('');
    resetPlayer();
    
    // Force reload available voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
      
      try {
        const availableVoices = speechSynthRef.current.getVoices();
        if (availableVoices.length > 0) {
          const englishVoices = availableVoices.filter(voice => voice.lang.includes('en'));
          setVoices(englishVoices);
          setLoadingVoices(false);
        }
      } catch (error) {
        console.error('Error loading voices:', error);
        setPlaybackError(`Failed to load voices: ${error}`);
      }
    }
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-white">
      {/* Background header image */}
      <div className="h-40 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center relative">
        <div className="text-center z-10">
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
            <SpeakerWaveIcon className="h-16 w-16 text-white mx-auto" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent"></div>
      </div>
      
      {/* Podcast info */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600 mb-4">{subject}</p>
        
        {/* Audio player */}
        <div className="podcast-player">
          {!usingSpeechSynthesis && audioUrl && (
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              preload="auto"
              onPlay={() => setIsPlaying(true)} 
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (audioRef.current && !seekingRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                }
              }}
              onError={(e) => {
                console.error('Audio error:', e);
                setPlaybackError('Failed to load or play audio file');
              }}
            />
          )}
          
          {/* Controls */}
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={togglePlayPause}
              disabled={usingSpeechSynthesis && (loadingVoices || voices.length === 0)}
              className={`w-12 h-12 rounded-full ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white flex items-center justify-center focus:outline-none transition-colors ${usingSpeechSynthesis && (loadingVoices || voices.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </button>
            
            <div className="text-gray-600 min-w-[80px]">
              {formatTime(currentTime)} / {formatTime(durationSeconds)}
            </div>
            
            <div className="flex-grow relative">
              <input
                type="range"
                min="0"
                max={durationSeconds}
                value={currentTime}
                onChange={handleSeek}
                onMouseUp={handleSeekComplete}
                onTouchEnd={handleSeekComplete}
                disabled={usingSpeechSynthesis && (loadingVoices || voices.length === 0)}
                className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${usingSpeechSynthesis && (loadingVoices || voices.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${(currentTime / durationSeconds) * 100}%, #e5e7eb ${(currentTime / durationSeconds) * 100}%, #e5e7eb 100%)`
                }}
                aria-label="Seek time"
              />
            </div>
            
            <div className="flex items-center">
              <SpeakerWaveIcon className="h-5 w-5 text-gray-500 mr-2" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
                }}
                aria-label="Volume control"
              />
            </div>
          </div>
          
          {/* Reset button and error messages */}
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={resetPlayer}
              className="text-sm text-gray-500 flex items-center hover:text-indigo-600 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Reset
            </button>
            
            {playbackError && (
              <div className="text-red-500 text-sm flex items-center">
                <button 
                  onClick={() => setPlaybackError('')}
                  className="mr-2 text-red-700 hover:text-red-900"
                >
                  ✕
                </button>
                {playbackError}
              </div>
            )}
          </div>
          
          {/* Status indicator */}
          {isPlaying && (
            <div className="mt-2 flex items-center justify-center text-xs text-gray-500">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
              Now playing{usingSpeechSynthesis ? ' with speech synthesis' : ''}
              {usingSpeechSynthesis && textSegments.length > 0 && (
                <span className="ml-1">
                  (segment {currentSegment + 1}/{textSegments.length})
                </span>
              )}
            </div>
          )}
          
          {/* Voice selector for speech synthesis */}
          {usingSpeechSynthesis && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700">
                  Select Voice
                </label>
                
                {loadingVoices && (
                  <div className="text-sm text-gray-500 flex items-center">
                    <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                    Loading voices...
                  </div>
                )}
              </div>
              
              {voices.length > 0 ? (
                <select
                  id="voice-select"
                  value={voiceIndex}
                  onChange={handleVoiceChange}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                >
                  {voices.map((voice, index) => (
                    <option key={`${voice.name}-${index}`} value={index}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm border rounded-md p-3 bg-yellow-50 text-yellow-700">
                  {loadingVoices ? (
                    'Loading available voices...'
                  ) : (
                    <>
                      No voices available. 
                      <button 
                        onClick={handleGenerateAudio}
                        className="ml-2 underline text-indigo-600 hover:text-indigo-800"
                      >
                        Try again
                      </button>
                    </>
                  )}
                </div>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                Try an Indian English voice for this content
              </p>
            </div>
          )}
          
          {!audioUrl && !usingSpeechSynthesis && (
            <div className="text-center mt-4">
              <button
                onClick={handleGenerateAudio}
                className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200"
              >
                Generate Audio
              </button>
              <p className="text-xs text-gray-500 mt-1">
                No audio file available. Generate audio using AI voice synthesis.
              </p>
            </div>
          )}
        </div>
        
        {/* Transcript toggle */}
        <div className="flex justify-between items-center mb-4 mt-6">
          <button 
            onClick={() => setShowTranscript(!showTranscript)} 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
          </button>
          
          <button className="inline-flex items-center text-gray-600 hover:text-gray-800">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Download
          </button>
        </div>
        
        {/* Transcript */}
        {showTranscript && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Transcript</h3>
            <div className="prose max-w-none text-gray-700 overflow-auto max-h-[500px]">
              <MarkdownWithMath>{transcript}</MarkdownWithMath>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PodcastPlayer; 