import express, { json } from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi";

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI); // criando config da conexão

app.post("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    let database = mongoClient.db("API_UOL");

    const { name } = req.body;

    await database.collection("participants").insertOne({
      name: name,
      lastStatus: Date.now(),
    });

    await database.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().locale("pt-br").format("HH:mm:ss"),
    });

    res.sendStatus(201);
  } catch (e) {
    console.log(chalk.redBright.bold("error ->"), e);
    res.sendStatus(500);
  } finally {
    mongoClient.close();
  }
});

app.get("/participants", async (req, res) => {
  try {
    await mongoClient.connect();
    const database = mongoClient.db("API_UOL");

    const participants = await database
      .collection("participants")
      .find({})
      .toArray();

  } catch (e) {
    console.log(chalk.redBright.bold("error ->"), e);
  } finally {
    mongoClient.close();
  }
});


app.listen(5000, () => {
  console.log(
    chalk.magentaBright.bold("Server is running on: http://localhost:5000")
  );
});
