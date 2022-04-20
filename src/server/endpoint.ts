/* eslint-disable fp/no-proxy */
/* eslint-disable fp/no-unused-expression */
/* eslint-disable no-shadow */
import * as express from 'express'

import { proxy, BodyProxy, QueryProxy, Proxy } from "../proxy"
import { BodyMethod, Json, QueryMethod, statusCodes, Method, JsonArray, applyParams, ExtractParams, ObjEmpty } from "../common"
import { Obj } from '@agyemanjp/standard'

/** Fluent endpoint factory */
export const endpoint = {
	get: queryEndpoint("GET"),
	delete: queryEndpoint("DELETE"),
	post: bodyEndpoint("POST"),
	patch: bodyEndpoint("PATCH"),
	put: bodyEndpoint("PUT"),
}


/** Fluent body-based route factory */
export function bodyEndpoint<M extends BodyMethod>(method: M) {
	return {
		url: <Url extends string>(url: Url) => ({
			bodyType: <Body extends Json>() => ({
				returnType: <Ret extends Json | JsonArray | null>() => ({
					handler: <H>(handlerFactory: (args: H) => BodyProxy<Body, Url, Promise<Ret>>) => ({
						method,
						route: url,
						handlerFactory: (args: H) => jsonHandler(handlerFactory(args), true /* wrap json results */),
						proxyFactory: <BaseUrl extends string, Params extends Partial<ExtractParams<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Params) =>
							proxy[method.toLowerCase() as Lowercase<BodyMethod>]
								.route(applyParams(`${baseUrl}/${url}`, params))
								.bodyType<Body>()
								.returnType<Wrap<Ret>>() as BodyProxy<Body, `${BaseUrl}/${Url}`, Promise<Wrap<Ret>>, Params>
					})
				})
			})
		})
	}
}
/** Fluent query-based route factory */
export function queryEndpoint<M extends QueryMethod>(method: M) {
	return {
		url: <Url extends string>(url: Url) => ({
			queryType: <Query extends Json<string>>() => ({
				returnType: <Ret extends Json | JsonArray | null>() => ({
					handler: <H>(handlerFactory: (args: H) => QueryProxy<Query, Url, Promise<Ret>>) => ({
						method,
						route: url,
						handlerFactory: (args: H) => jsonHandler(handlerFactory(args), true /* wrap json results */),
						proxyFactory: <BaseUrl extends string, Params extends Partial<ExtractParams<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Params) =>
							proxy[method.toLowerCase() as Lowercase<QueryMethod>]
								.route(applyParams(`${baseUrl}/${url}`, params))
								.queryType<Query>()
								.returnType<Wrap<Ret>>() as QueryProxy<Query, `${BaseUrl}/${Url}`, Promise<Wrap<Ret>>, Params>
					})
				})
			}),
			headersType: <Headers extends Json<string>>() => ({
				returnType: <Ret extends Json | JsonArray | null>() => ({
					handler: <H>(handlerFactory: (args: H) => QueryProxy<Headers, Url, Promise<Ret>>) => ({
						method,
						route: url,
						handlerFactory: (args: H) => jsonHandler(handlerFactory(args), true /* wrap json results */),
						proxyFactory: <BaseUrl extends string, Params extends Partial<ExtractParams<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Params) =>
							proxy[method.toLowerCase() as Lowercase<QueryMethod>]
								.route(applyParams(`${baseUrl}/${url}`, params))
								.headersType<Headers>()
								.returnType<Wrap<Ret>>() as QueryProxy<Headers, `${BaseUrl}/${Url}`, Promise<Wrap<Ret>>, Params>
					})
				})
			})
		})
	}
}

/** Create handler accepting typed JSON data (in query, params, header, and/or body) and returning JSON data */
export function jsonHandler<I, O>(fn: (req: I & RequestUrlInfo) => Promise<O>, wrap = false): express.Handler {
	return async (req, res) => {
		try {
			const r = await fn({
				...req.body,
				...req.query,
				...req.headers,
				...req.params,
				url: req.url,
				baseUrl: req.baseUrl,
				originalUrl: req.originalUrl
			})
			res.status(statusCodes.OK).json(wrap ? { data: r } : r)
		}
		catch (err) {
			res.status(statusCodes.INTERNAL_SERVER_ERROR).send(wrap ? { error: err } : err)
		}
	}
}

/** Creates a client final endpoint based on a server endpoint */
export function clientEndpoint<
	M extends Method = Method,
	Route extends string = string,
	BaseUrl extends string = string,
	HandlerCtx = any,
	QueryBody extends Json<string> = ObjEmpty,
	Params extends Partial<ExtractParams<Route>> = ObjEmpty,
	Ret extends Json = Json
>(endpoint: Endpoint<M, Route, HandlerCtx, QueryBody, Ret>, baseUrl: BaseUrl, params: Params) {
	const proxy = endpoint.proxyFactory(baseUrl, params as any)
	const newRoute = applyParams(endpoint.route, params as any)
	return {
		method: endpoint.method,
		route: newRoute,
		handler: jsonHandler(proxy),
		proxy: proxy
	} as EndpointFinal<M, QueryBody & Exclude<ExtractParams<`${BaseUrl}/${Route}`>, Params>, Ret>
}

export type Endpoint<M extends Method = Method, R extends string = string, H = any, Args extends Json<string> = Json<string>, Ret extends Json = Json> = {
	method: M,
	route: R,
	handlerFactory: (arg: H) => express.Handler,
	proxyFactory: <BaseUrl extends string, Params extends Partial<ExtractParams<`${BaseUrl}/${R}`>> | ObjEmpty = ObjEmpty>(url: BaseUrl, params: Params) =>
		Proxy<Args, `${BaseUrl}/${R}`, Promise<Wrap<Ret>>, Params>
}

export type EndpointFinal<M extends Method = Method, Args extends Json = Json, Ret extends Json = Json> = {
	method: M,
	route: string,
	handler: express.Handler,
	proxy: (args: Args) => Promise<Wrap<Ret>>
}

type RequestUrlInfo = { url: string, baseUrl: string, originalUrl: string }
type Wrap<T> = ({ data: T } | { error: string })

/*function createBodyRoute<M extends BodyMethod, P extends string, U extends string, H extends PGRepo>(route: Route<M, U, H>) {
	return {
		proxyFactory: <B extends Json, R extends Json>(baseUrl: P) => [
			...route,
			proxy[route[0].toLowerCase() as Lowercase<M>]
				.route(`${baseUrl}${route[1]}`)
				.bodyType<B>()
				.returnType<R>() as BodyProxy<B, Concat<P, U>, R>
		] as const
	}
}*/
/*function createQueryRoute<M extends QueryMethod, U extends string, H extends PGRepo, P extends string>(route: Route<M, U, H>) {
	return {
		proxyFactory: <Q extends Json<string>, R extends Json>(baseUrl: P) => ({
			...route,
			proxy: proxy[route[0].toLowerCase() as Lowercase<M>]
				.route(`${baseUrl}${route[1]}`)
				.queryType<Q>()
				.returnType<R>()
		})
	}
}*/


type User = {
	id: string,
	displayName: string,
	emailAddress: string,
	companyName: string,
	accessLevel: number,
	whenVerified?: number,
	app: string
}

// const verify = endpoint
// 	.post
// 	.url("/:app/verify")
// 	.bodyType<{ emailAddress: string, verificationCode: string, accessLevel: number }>()
// 	.returnType<User>()
// 	.handler<PGRepo>(db => (async (args) => {
// 		const { emailAddress, verificationCode, accessLevel } = args
// 		const users = await db.getAsync("users", {
// 			filters: [
// 				{ fieldName: "emailAdress", operator: "equals", value: emailAddress },
// 				{ fieldName: "verificationCode", operator: "equals", value: verificationCode }
// 			]
// 		})
// 		console.log(`Users matching verification found: ${stringify(users)}`)

// 		if (users.length > 0) {
// 			const updatedUser = {
// 				...users[0],
// 				whenVerified: Date.now(),
// 				...(accessLevel ? { accessLevel: accessLevel } : {}
// 				)
// 			} as User
// 			await db.updateAsync("usersReadonly", updatedUser)
// 			return sanitizeUser(updatedUser)
// 		}
// 		else {
// 			throw (statusCodes.NOT_FOUND.toString())
// 		}
// 	}))


// const verifyClient = clientEndpoint(verify, "authURL", { app: "" })
