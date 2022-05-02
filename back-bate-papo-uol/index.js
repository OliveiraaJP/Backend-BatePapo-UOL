import express, { json } from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

let database = null;
const mongoClient = new MongoClient(process.env.MONGO_URI); // criando config da conexão
const promise = mongoClient.connect();
promise.then(() => {
  database = mongoClient.db("API_UOL");
  console.log("Connected Database");
});
promise.catch((e) => console.log("Connection Lost", e));

app.post("/participants", async (req, res) => {
  try {
    const { name } = req.body;

    const userSchema = joi.object({
      name: joi.string().min(1).required(),
    });

    const validation = userSchema.validate(req.body)

    if(validation.error){
      console.log("Empty name");
      res.sendStatus(422)
      return;
    }

    const nameExist = await database.collection("participants").findOne({name: name})
    if(nameExist){
      console.log("Name already exists");
      res.sendStatus(409)
      return;
    }

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
    console.log(chalk.redBright.bold("error"));
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {

    const participants = await database
      .collection("participants")
      .find({})
      .toArray();
  } catch (e) {
    console.log(chalk.redBright.bold("error ->"), e);
  }
});

app.get("/messages", async (req, res) => {
  try{
    const limit = parseInt(req.query.limit)
    const user = req.headers.user

    const messages = await database.collection("messages").find({
      $or: [
        {to: "Todos"},
        {to: user},
        {from: user}
      ]}).toArray()

    if(limit === undefined){
      res.send(messages)
      return
    }

    res.send(messages.slice(- parseInt(limit)))

  }catch(e){
    console.log("erro message", e);
    res.sendStatus(500)
  }
})

app.listen(5000, () => {
  console.log(
    chalk.magentaBright.bold("Server is running on: http://localhost:5000")
  );
});
