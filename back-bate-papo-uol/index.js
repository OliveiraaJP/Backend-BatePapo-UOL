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




function removeInactive(){
setInterval(async ()=>{
  try{
    const allParticipants = await database.collection("participants").find({}).toArray()

    if(!allParticipants){
      console.log("nenhum participante");
      return;
    }

    allParticipants.forEach(async (participant) => {
      if(Date.now() - parseInt(participant.lastStatus) > 10000){
        try{
          await database.collection("participants").deleteOne({name: participant.name});
          await database.collection("messages").insertOne({
            from: participant.name,
            to: "Todos",
            text: "sai da sala...",
            type: "status",
            time: dayjs().locale("pt-br").format("HH:mm:ss")
          })
          console.log(participant.name ,"deletou legal vazou passou 10s");
        }catch(e){
          console.log("falou a remoção inativa");
        }
      }
    })
  }catch(e){
    console.log("remove inactive error")
  }
}, 15000)
}


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

    removeInactive()
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

app.post("/messages", async (req, res) => {
try{
  const {to, text, type} = req.body
  const user = req.headers.user

  const userSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.required().valid("message","private_message")
  });

  const validation = userSchema.validate(req.body)

  const userValidation = await database.collection("participants").findOne({name: user})

  if(validation.error){
    res.sendStatus(422);
    return;
  }

  if (!userValidation){
    res.sendStatus(422);
    return;
  }


  await database.collection("messages").insertOne({
    to,
    text,
    type,
    from: user,
    time: dayjs().locale("pt-br").format("HH:mm:ss")
  })

  res.sendStatus(201)

} catch(e){
  console.log("post messages error");
  res.sendStatus(500)
}
})

app.post("/status", async (req, res) =>{
  const user = req.headers.user
  
  try{
  const userExist = await database.collection("participants").findOne({name: user})
    

  if(userExist === undefined ){
    res.sendStatus(404)
    console.log("participante nao ta na lista");
    return;
  }

  await database.collection("participants").updateOne({name:user},{$set: {lastStatus: Date.now()}} );
  res.sendStatus(200)
  


} catch(e){
  console.log("erro post status");
  res.sendStatus(500)
}
})


app.listen(5000, () => {
  console.log(
    chalk.magentaBright.bold("Server is running on: http://localhost:5000")
  );
});
