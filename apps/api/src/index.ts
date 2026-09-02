import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok", service: "pulseops-api" });
});

app.listen(PORT, () => {
    console.log(`PulseOps API running on port ${PORT}`);
});
