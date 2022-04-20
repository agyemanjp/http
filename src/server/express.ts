/* eslint-disable fp/no-unused-expression */
import * as Net from 'net'
import * as cuid from 'cuid'
import * as express from 'express'
import { Obj } from '@agyemanjp/standard/utility'

import { Method } from '../common'
import { Endpoint } from './endpoint'


/** Start express server */
export function startServer<Context>(args: ServerArgs<Context>) {
	// configureEnvironment()
	// const args.name = "auth"
	const PORT = process?.env?.PORT || args.defaultPort
	const sockets: Obj<Net.Socket> = {}

	// console.log(`process.env.DATABASE_URL: ${process.env.DATABASE_URL} `)
	// const dbRepo = new PostgresRepository({ dbUrl: process.env.DATABASE_URL! })
	const app = express()

	// set up middleware
	args.middleware.forEach(m => app.use(m))

	// set up main routes
	args.endpoints.forEach(r => app[r.method.toLowerCase() as Lowercase<Method>](r.route, r.handlerFactory(args.context)))

	console.log(`\n${args.name} server starting...`)
	const server = app.listen(PORT, () => {
		console.log(`${args.name} server started on port ${PORT} at ${new Date().toLocaleString()} \n`, true)
	})
	server.on('connection', socket => {
		const socketId = cuid()
		// eslint-disable-next-line fp/no-delete
		socket.on('close', () => delete sockets[socketId])
		sockets[socketId] = socket
	})

	const cleanShutdown = (reason: unknown, error?: unknown) => {
		if (error)
			console.error(`\n${args.name} server shutting down due to: ${reason}\n${error instanceof Error ? error.stack : error}`)
		else
			console.warn(`\n${args.name} server shutting down due to: ${reason}`)

		server.close(() => {
			console.log(`${args.name} server closed\n`)
			process.exit(error === undefined ? 0 : 1)
		})

		Object.keys(sockets).forEach(socketId => {
			sockets[socketId].destroy()
			//console.log('socket', socketId, 'destroyed')
		})
	}

	process.on('unhandledRejection', (reason: unknown) => cleanShutdown(`Unhandled rejection`, reason))
	process.on('uncaughtException', (err: Error) => cleanShutdown(`Uncaught exception`, err))
	process.on('SIGTERM', (signal) => cleanShutdown(signal))
	process.on('SIGINT', (signal) => cleanShutdown(signal))
}

type ServerArgs<Context> = {
	name: string
	middleware: express.Handler[],
	endpoints: Omit<Endpoint, "proxyFactory">[],
	defaultPort: number
	context: Context
}
