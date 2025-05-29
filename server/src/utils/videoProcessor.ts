import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { OpenAI } from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Add type for ffmpeg-static
declare module 'ffmpeg-static' {
  const ffmpegPath: string;
  export default ffmpegPath;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Set the path to ffmpeg
const ffmpegPath = ffmpegStatic as string;
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.warn('ffmpeg-static path not found. Video processing may not work correctly.');
}

export async function extractAudioFromVideo(videoBuffer: Buffer, outputPath: string): Promise<string> {
  const tempVideoPath = path.join('/tmp', `temp-${Date.now()}.mp4`);
  await writeFile(tempVideoPath, videoBuffer);

  const audioPath = path.join('/tmp', `audio-${Date.now()}.mp3`);

  return new Promise((resolve, reject) => {
    ffmpeg(tempVideoPath)
      .output(audioPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('end', async () => {
        await unlink(tempVideoPath);
        resolve(audioPath);
      })
      .on('error', async (err) => {
        await unlink(tempVideoPath);
        if (fs.existsSync(audioPath)) {
          await unlink(audioPath);
        }
        reject(new Error(`Error extracting audio: ${err.message}`));
      })
      .run();
  });
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath) as any, // Type assertion as a workaround for Node.js stream
      model: 'whisper-1',
    });
    
    await unlink(audioPath); // Clean up the audio file
    return transcription.text;
  } catch (error: any) {
    throw new Error(`Transcription failed: ${error.message || 'Unknown error'}`);
  }
}

export async function processVideoToText(videoBuffer: Buffer): Promise<string> {
  try {
    // Extract audio from video
    const audioPath = await extractAudioFromVideo(videoBuffer, '/tmp');
    
    // Transcribe audio to text
    const text = await transcribeAudio(audioPath);
    
    return text;
  } catch (error: any) {
    console.error('Error processing video:', error);
    throw new Error(`Failed to process video to text: ${error.message || 'Unknown error'}`);
  }
}
