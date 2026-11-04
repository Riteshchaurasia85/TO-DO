const dns = require("node:dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const app = require("./app");
const connectDatabase = require("./config/db");

const port = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith("replace_")) {
  console.error("Unable to start TaskFlow API: set JWT_SECRET to a private random value of at least 32 characters in backend/.env");
  process.exitCode = 1;
} else {
  connectDatabase()
    .then(() => {
      app.listen(port, () => console.log(`TaskFlow API listening on port ${port}`));
    })
    .catch((error) => {
      console.error(`Unable to start TaskFlow API: ${error.message}`);
      process.exitCode = 1;
    });
}
