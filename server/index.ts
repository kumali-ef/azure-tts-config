import express from 'express';
import cors from 'cors';
import recordingsRouter from './routes';
import minimaxRouter from './minimax-routes';

const app = express();
const PORT = 7740;

app.use(cors());
app.use(express.json());
app.use('/api', recordingsRouter);
app.use('/api/minimax', minimaxRouter);

app.listen(PORT, () => {
  console.log(`TTS Config Tester backend running on http://localhost:${PORT}`);
});
