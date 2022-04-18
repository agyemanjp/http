/* eslint-disable fp/no-unused-expression */
/* eslint-disable no-shadow */
import * as express from 'express'
import { Concat, Obj } from '@agyemanjp/standard/utility'

import { proxy } from "../proxy"
import { BodyMethod, Json, QueryMethod, statusCodes, Method, BodyProxy, QueryProxy, Wrap, JsonArray } from "../types"

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
						handlerFactory: (args: H) => jsonEndpoint(handlerFactory(args), true /* wrap json results */),
						proxyFactory: <BaseUrl extends string>(baseUrl: BaseUrl) => proxy[method.toLowerCase() as Lowercase<BodyMethod>]
							.route(`${baseUrl}/${url}` as `${BaseUrl}/${Url}`)
							.bodyType<Body>()
							.returnType<Wrap<Ret>>() //as BodyProxy<Body, Concat<BaseUrl, Url>, Ret>
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
						handlerFactory: (args: H) => jsonEndpoint(handlerFactory(args), true /* wrap json results */),
						proxyFactory: <BaseUrl extends string>(baseUrl: BaseUrl) => proxy[method.toLowerCase() as Lowercase<QueryMethod>]
							.route(`${baseUrl}/${url}` as `${BaseUrl}/${Url}`)
							.queryType<Query>()
							.returnType<Wrap<Ret>>() //as QueryProxy<Query, Concat<BaseUrl, Url>, Ret>
					})
				})
			}),
			headersType: <Headers extends Json<string>>() => ({
				returnType: <Ret extends Json | JsonArray | null>() => ({
					handler: <H>(handlerFactory: (args: H) => QueryProxy<Headers, Url, Promise<Ret>>) => ({
						method,
						route: url,
						handlerFactory: (args: H) => jsonEndpoint(handlerFactory(args), true /* wrap json results */),
						proxyFactory: <BaseUrl extends string>(baseUrl: BaseUrl) => proxy[method.toLowerCase() as Lowercase<QueryMethod>]
							.route(`${baseUrl}/${url}` as `${BaseUrl}/${Url}`)
							.headersType<Headers>()
							.returnType<Wrap<Ret>>() //as QueryProxy<Query, Concat<BaseUrl, Url>, Ret>
					})
				})
			})
		})
	}
}

/** Create handler accepting typed JSON data (in query, params, header, and/or body) and returning JSON data */
export function jsonEndpoint<I, O>(fn: (req: I & RequestUrlInfo) => O, wrap = false): express.Handler {
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

/** Creates an endpoint that delegates to another endpoint without modifying its behavior in any way */
export function passthroughEndpointProxy<M extends Method = Method, R extends string = string, H = any>(endpoint: Endpoint<M, R, H>): Endpoint<M, R, H> {
	return {
		...endpoint,
		proxyFactory: (urlExternalBase) => endpoint.proxyFactory(urlExternalBase)
	}
}

export type Endpoint<M extends Method = Method, Route extends string = string, HandlerArgs = any> = {
	method: M,
	route: Route,
	handlerFactory: (arg: HandlerArgs) => express.Handler,
	proxyFactory: <P extends string>(arg: P) => (...args: any[]) => Promise<any>
}

type RequestUrlInfo = { url: string, baseUrl: string, originalUrl: string }

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
