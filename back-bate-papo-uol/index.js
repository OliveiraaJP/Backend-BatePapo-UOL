import express, {json} from "express";
import cors from "cors";
import chalk from "chalk";

const app = express();
app.use(cors());
app.use(json());

let participants= []

app.get("/participants", (req, res) => {
    res.send(participants)
})


app.listen(5000, () =>{
    console.log(chalk.magentaBright.bold("Server is running on: http://localhost:5000"));
})