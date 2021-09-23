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
const goodbye = () => process.kill(process.pid, "SIGUSR2")
process.once("SIGUSR2", goodbye)
