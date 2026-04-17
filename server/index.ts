import express from 'express';
import cors from 'cors';
import recordingsRouter from './routes';
import minimaxRouter from './minimax-routes';
import qwen3Router from './qwen3-routes';
import cartesiaRouter from './cartesia-routes';
import elevenlabsRouter from './elevenlabs-routes';

const app = express();
const PORT = 7740;

app.use(cors());
app.use(express.json());
app.use('/api', recordingsRouter);
app.use('/api/minimax', minimaxRouter);
app.use('/api/qwen3', qwen3Router);
app.use('/api/cartesia', cartesiaRouter);
app.use('/api/elevenlabs', elevenlabsRouter);

app.listen(PORT, () => {
  console.log(`TTS Config Tester backend running on http://localhost:${PORT}`);
});
