
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

// Extension to window for AI Studio helpers
// Fixed: Using interface to match external declarations if they exist, 
// but often in these environments 'any' or a matching structure is safer.
// However, the error suggests a conflict with an existing 'AIStudio' type.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio: AIStudio;
  }
}

const ASPECT_RATIOS = [
  { label: '9:16 (Portrait)', value: '9:16' },
  { label: '16:9 (Landscape)', value: '16:9' }
];

const PRESET_POSITIONS = [
  "Walking confidently through a modern office, waving at colleagues",
  "Sitting at a coffee shop table, working on a laptop, and taking a sip of coffee",
  "Giving a professional presentation, gesturing towards a digital screen",
  "Doing an energetic 'thumbs up' and winking at the camera",
  "Holding a smartphone and showing the screen with a bright smile"
];

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      console.error("API key check failed", e);
    }
  };

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    // Assuming success immediately as per guidelines to handle race conditions
    setHasApiKey(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAnimation = async () => {
    if (!selectedImage) return;
    
    setIsGenerating(true);
    setError(null);
    setLoadingStep('Initializing AI engine...');

    try {
      // Create a new instance right before the call to ensure latest key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Clean base64 string
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      setLoadingStep('Uploading reference frame to Veo...');
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Animate this character: ${prompt || "Natural movement in high quality commercial lighting"}`,
        image: {
          imageBytes: base64Data,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio as any
        }
      });

      const loadingMessages = [
        "Analyzing avatar features...",
        "Simulating physics and movement...",
        "Rendering commercial lighting...",
        "Finalizing high-quality motion...",
        "Almost there, polishing textures..."
      ];

      let messageIndex = 0;
      while (!operation.done) {
        setLoadingStep(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        const downloadLink = operation.response.generatedVideos[0].video.uri;
        setLoadingStep('Downloading final commercial asset...');
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setGeneratedVideoUrl(URL.createObjectURL(blob));
      } else {
        throw new Error("No video was generated in the response.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        // As per guidelines, reset key selection state and prompt user to select again
        setHasApiKey(false);
        setError("API Key session expired or invalid. Please select a paid project key.");
      } else {
        setError(err.message || "An error occurred during generation. Please try again.");
      }
    } finally {
      setIsGenerating(false);
      setLoadingStep('');
    }
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 shadow-2xl text-center">
          <h1 className="text-3xl font-bold mb-4 text-white">Avatar Animator</h1>
          <p className="text-gray-300 mb-8">
            This tool requires a paid API key from Google AI Studio to use the Veo video generation model.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30"
          >
            Select API Key & Start
          </button>
          <p className="mt-4 text-xs text-gray-400">
            Make sure your key is from a project with <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline">billing enabled</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 text-white">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          AVATAR ANIMATOR PRO
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.reload()}
            className="text-xs bg-gray-800 px-3 py-1 rounded-full border border-gray-700 hover:bg-gray-700"
          >
            New Session
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Side: Setup */}
        <section className="space-y-8">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs">1</span>
              Upload Your Avatar
            </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-square md:aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                selectedImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              {selectedImage ? (
                <img src={selectedImage} alt="Selected" className="h-full w-full object-contain p-2" />
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-gray-400">Click to upload image</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs">2</span>
              Commercial Action
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Animation Prompt</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the movement: 'The character waves confidently with a warm smile in 4k lighting'"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_POSITIONS.map((preset, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setPrompt(preset)}
                      className="text-[10px] bg-gray-800 hover:bg-indigo-900 border border-gray-700 px-3 py-1 rounded-full transition-colors"
                    >
                      {preset.split(',')[0]}...
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Format</label>
                <div className="grid grid-cols-2 gap-4">
                  {ASPECT_RATIOS.map(ar => (
                    <button 
                      key={ar.value}
                      onClick={() => setAspectRatio(ar.value)}
                      className={`py-2 px-4 rounded-lg text-sm border transition-all ${
                        aspectRatio === ar.value 
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400' 
                          : 'border-gray-700 bg-gray-800 text-gray-400'
                      }`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button 
            disabled={!selectedImage || isGenerating}
            onClick={generateAnimation}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              !selectedImage || isGenerating 
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Generate Commercial Animation'
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </section>

        {/* Right Side: Preview */}
        <section className="relative">
          <div className="sticky top-8 bg-gray-900 rounded-3xl border border-gray-800 p-2 overflow-hidden shadow-2xl">
            <div className="bg-gray-950 rounded-[2rem] min-h-[500px] flex items-center justify-center relative overflow-hidden">
              {!isGenerating && !generatedVideoUrl && !selectedImage && (
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-gray-400 font-medium">Result Preview</h3>
                  <p className="text-gray-600 text-sm mt-2">Upload an avatar and describe its movement to see the magic</p>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-12 text-center">
                   <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin"></div>
                    {selectedImage && (
                      <img src={selectedImage} alt="Overlay" className="absolute inset-4 w-24 h-24 rounded-full object-cover opacity-50 blur-[2px]" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 animate-pulse">Generating Animation</h3>
                  <p className="text-indigo-400 font-mono text-sm uppercase tracking-widest">{loadingStep}</p>
                  <p className="text-gray-500 mt-4 text-xs max-w-xs">
                    This typically takes 1-3 minutes. We are processing high-fidelity motion data.
                  </p>
                </div>
              )}

              {generatedVideoUrl && !isGenerating && (
                <div className="w-full h-full">
                  <video 
                    src={generatedVideoUrl} 
                    className="w-full h-full object-cover" 
                    controls 
                    autoPlay 
                    loop
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <a 
                      href={generatedVideoUrl} 
                      download="avatar_commercial.mp4"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-full shadow-lg"
                      title="Download Video"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {selectedImage && !isGenerating && !generatedVideoUrl && (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                  <img src={selectedImage} alt="Placeholder" className="max-h-full max-w-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
                  <div className="absolute bottom-12 text-center">
                    <p className="text-white font-bold text-xl">READY TO ANIMATE</p>
                    <p className="text-gray-400 text-sm">Hit the generate button to begin rendering</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-24 py-12 border-t border-gray-800 text-center">
        <p className="text-gray-600 text-sm">
          Powered by Gemini Veo 3.1 &bull; Commercial Grade Motion Synthesis
        </p>
      </footer>
    </div>
  );
};

export default App;
