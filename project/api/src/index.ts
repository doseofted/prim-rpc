import { app } from "./http"

// start listening for requests
app.listen(3001, "0.0.0.0", (err, address) => {
	if (err) {
		app.log.error(err)
		process.exit(1)
	}
	app.log.info(`server listening on ${address}`)
})

// NOTE: run any graceful shutdown processes if needed (for nodemon)
const goodbye = () => { process.exit(0) }
process.once("SIGTERM", goodbye)
// process.on("SIGUSR2", () => console.log("reloading"))
