
import React, { useState, useCallback } from 'react';
import { generateClothedImage } from './services/geminiService';

// --- Helper Functions ---
const fileToUrlAndBase64 = (file: File): Promise<{ previewUrl: string, base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.split(':')[1].split(';')[0];
      resolve({ previewUrl: result, base64: data, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};


// --- Child Components (defined outside App to prevent re-renders) ---

const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
    <p className="text-lg text-gray-600 font-medium">Creating your new look...</p>
  </div>
);

interface ImageUploaderProps {
  id: string;
  title: string;
  onImageUpload: (file: File) => void;
  previewUrl: string | null;
  // Fix: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactElement;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, title, onImageUpload, previewUrl, icon }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-2xl shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">{title}</h3>
      <label
        htmlFor={id}
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer
                    ${previewUrl ? 'border-indigo-300' : 'border-gray-300 hover:border-indigo-400'}
                    bg-gray-50 hover:bg-gray-100 transition-colors`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500">
            {icon}
            <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span></p>
            <p className="text-xs">PNG, JPG, or WEBP</p>
          </div>
        )}
        <input id={id} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
      </label>
    </div>
  );
};

interface ResultImageProps {
    imageUrl: string;
}

const ResultImage: React.FC<ResultImageProps> = ({ imageUrl }) => (
    <div className="mt-8 w-full max-w-2xl mx-auto bg-white p-4 rounded-2xl shadow-2xl border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Generated Image</h2>
        <div className="aspect-w-1 aspect-h-1">
             <img src={imageUrl} alt="Generated result" className="rounded-lg object-contain w-full h-full" />
        </div>
    </div>
);


// --- Main App Component ---

interface ImageState {
  base64: string | null;
  mimeType: string | null;
  previewUrl: string | null;
}

const initialImageState: ImageState = { base64: null, mimeType: null, previewUrl: null };

export default function App() {
  const [dressImage, setDressImage] = useState<ImageState>(initialImageState);
  const [personImage, setPersonImage] = useState<ImageState>(initialImageState);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback(async (file: File, type: 'dress' | 'person') => {
    try {
      const { previewUrl, base64, mimeType } = await fileToUrlAndBase64(file);
      if (type === 'dress') {
        setDressImage({ previewUrl, base64, mimeType });
      } else {
        setPersonImage({ previewUrl, base64, mimeType });
      }
    } catch (err) {
      console.error("Error processing file:", err);
      setError("Failed to load image. Please try another file.");
    }
  }, []);

  const handleGenerateClick = async () => {
    if (!dressImage.base64 || !personImage.base64 || !dressImage.mimeType || !personImage.mimeType) {
      setError("Please upload both a dress and a person image.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const resultBase64 = await generateClothedImage(
        dressImage.base64,
        dressImage.mimeType,
        personImage.base64,
        personImage.mimeType
      );
      setGeneratedImage(`data:image/png;base64,${resultBase64}`);
    } catch (err: any) {
      console.error("Error generating image:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const canGenerate = dressImage.base64 !== null && personImage.base64 !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans">
      <main className="container mx-auto px-4 py-10">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
            Cloth Match
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            Virtually try on any outfit. Upload a photo of a dress and a person to see the magic happen.
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <ImageUploader
                    id="dress-upload"
                    title="1. Upload Dress"
                    onImageUpload={(file) => handleImageUpload(file, 'dress')}
                    previewUrl={dressImage.previewUrl}
                    icon={
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                    }
                />
                <ImageUploader
                    id="person-upload"
                    title="2. Upload Person"
                    onImageUpload={(file) => handleImageUpload(file, 'person')}
                    previewUrl={personImage.previewUrl}
                    icon={
                         <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 11 14H9a3.987 3.987 0 0 0-3.951 3.512A8.949 8.949 0 0 0 10 19Zm-2-7a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"/></svg>
                    }
                />
            </div>

            <div className="text-center">
              <button
                onClick={handleGenerateClick}
                disabled={!canGenerate || isLoading}
                className={`px-12 py-4 text-lg font-semibold rounded-full text-white
                            transition-all duration-300 ease-in-out transform hover:scale-105
                            ${!canGenerate || isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                            }`}
              >
                {isLoading ? 'Generating...' : 'Create My Look'}
              </button>
            </div>
        </div>

        {error && (
            <div className="mt-8 max-w-2xl mx-auto p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
                <strong>Error:</strong> {error}
            </div>
        )}

        <div className="mt-8 flex justify-center">
            {isLoading && <Spinner />}
            {generatedImage && <ResultImage imageUrl={generatedImage} />}
        </div>

      </main>
    </div>
  );
}