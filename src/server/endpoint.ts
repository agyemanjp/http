/* eslint-disable fp/no-unused-expression */
/* eslint-disable no-shadow */
import * as express from 'express'
import { Concat, Obj } from '@agyemanjp/standard/utility'

import { proxy } from "../proxy"
import { BodyMethod, Json, ExtractRouteParams, QueryMethod, statusCodes, Method, BodyProxy, QueryProxy } from "../types"

/** Fluent endpoint factory */
export const endpoint = {
	get: queryEndpoint("get"),
	delete: queryEndpoint("delete"),
	post: bodyEndpoint("post"),
	patch: bodyEndpoint("patch"),
	put: bodyEndpoint("put"),
}

/** Fluent body-based route factory */
export function bodyEndpoint<M extends BodyMethod>(method: Lowercase<M>) {
	return {
		url: <Url extends string>(url: Url) => ({
			bodyType: <Body extends Json>() => ({
				returnType: <Ret extends Json>() => ({
					handler: <H>(handlerFactory: (args: H) => (args: Body & ExtractRouteParams<Url>) => Promise<Ret>) => [
						method,
						url,

						// handler factory
						(args: H) => jsonEndpoint(handlerFactory(args)),

						// proxy factory
						<BaseUrl extends string>(baseUrl: BaseUrl) => proxy[method.toLowerCase() as Lowercase<BodyMethod>]
							.route(`${baseUrl}${url}` as Concat<BaseUrl, Url>)
							.bodyType<Body>()
							.returnType<Ret>() as BodyProxy<Body, Concat<BaseUrl, Url>, Ret>
					] as const
				})
			})
		})
	}
}
/** Fluent query-based route factory */
export function queryEndpoint<M extends QueryMethod>(method: Lowercase<M>) {
	return {
		url: <Url extends string>(url: Url) => ({
			queryType: <Query extends Json<string>>() => ({
				returnType: <Ret extends Json>() => ({
					handler: <H>(handlerFactory: (args: H) => (args: Query & ExtractRouteParams<Url>) => Promise<Ret>) => [
						method,
						url,

						// handler factory
						(args: H) => jsonEndpoint(handlerFactory(args)),

						// proxy factory
						<BaseUrl extends string>(baseUrl: BaseUrl) => proxy[method.toLowerCase() as Lowercase<QueryMethod>]
							.route(`${baseUrl}${url}` as Concat<BaseUrl, Url>)
							.queryType<Query>()
							.returnType<Ret>() as QueryProxy<Query, Concat<BaseUrl, Url>, Ret>
					] as const
				})
			})
		})
	}
}

/** Create handler accepting typed JSON data (in query, params, header, and/or body) and returning JSON data */
export function jsonEndpoint<I, O>(fn: (req: I) => Promise<O>, wrap = false): express.Handler {
	return async (req, res) => {
		try {
			const r = await fn({ ...req.body, ...req.query, ...req.headers, ...req.params } as I)
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
