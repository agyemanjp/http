/* eslint-disable no-unused-expressions */
/* eslint-disable fp/no-unused-expression */
import * as Net from 'net'
import * as cuid from 'cuid'
import * as express from 'express'
import { Obj } from '@agyemanjp/standard/utility'

import { Handler, RouteObject, RouteTriple } from './route-proxy'


/** Start express server */
export function startServer<H extends Handler = Handler>(args: ServerArgs<H>) {
	const app = express()

	// Set up routes
	args.routes.forEach(route => {
		if (typeof route === "function") {
			app.use(route)
			console.log(`Set up "${route.name}" middleware`)
		}

		else {
			if (Array.isArray(route)) {
				app[route[1]](route[0], route[2])
				console.log(`Set up route "${route[1]}" for "${route[0]}"`)
			}
			else {
				app[route.method](route.url, route.handler)
				console.log(`Set up route "${route.method}" for "${route.url}"`)
			}
		}
	})

	const sockets: Obj<Net.Socket> = {}

	// Start server
	console.log(`\n${args.name} server starting...`)
	const server = (app
		.listen(args.port, () => {
			console.log(`${args.name} server started on port ${args.port} at ${new Date().toLocaleString()} \n`)
		})
		.on('connection', socket => {
			const socketId = cuid()
			// eslint-disable-next-line fp/no-delete
			socket.on('close', () => delete sockets[socketId])
			sockets[socketId] = socket
		})
	)

	// Setup process error handlers
	process.on('unhandledRejection', (reason: unknown) => cleanShutdown(`Unhandled rejection`, reason))
	process.on('uncaughtException', (err: Error) => cleanShutdown(`Uncaught exception`, err))
	process.on('SIGTERM', (signal) => cleanShutdown(signal))
	process.on('SIGINT', (signal) => cleanShutdown(signal))

	function cleanShutdown(reason: unknown, error?: unknown) {
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
}


type ServerArgs<H extends Handler = Handler> = {
	name: string
	routes: (
		RouteObject |
		RouteTriple |
		H
	)[],
	port: number | string,
}
