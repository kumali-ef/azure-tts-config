import express from 'express';
import cors from 'cors';
import recordingsRouter from './routes';

const app = express();
const PORT = 7740;

app.use(cors());
app.use(express.json());
app.use('/api', recordingsRouter);

app.listen(PORT, () => {
  console.log(`Azure TTS Config backend running on http://localhost:${PORT}`);
});
