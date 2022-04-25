/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable fp/no-proxy */
/* eslint-disable fp/no-unused-expression */
/* eslint-disable no-shadow */
import * as express from 'express'

import { proxy, BodyProxy, QueryProxy, Proxy } from "../proxy"
import { BodyMethod, Json, QueryMethod, statusCodes, Method, JsonArray, applyParams, Params } from "../common"

/** Fluent route factory */
export const route = {
	get: queryRoute("GET"),
	delete: queryRoute("DELETE"),
	post: bodyRoute("POST"),
	patch: bodyRoute("PATCH"),
	put: bodyRoute("PUT"),
}

/** Fluent body-based route factory */
export function bodyRoute<M extends BodyMethod>(method: M) {
	return {
		url: <Url extends string>(url: Url) => ({
			bodyType: <Body extends Json>() => ({
				returnType: <Ret extends JsonRet>() => ({
					handler: (fn: BodyProxy<Body, Url, Promise<Ret>>) => ({
						proxyFactory: <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) =>
							proxy[method.toLowerCase() as Lowercase<BodyMethod>]
								.route(applyParams(`${baseUrl}/${url}`, params))
								.bodyType<Body>()
								.returnType<Wrap<Ret>>() as BodyProxy<Body, `${BaseUrl}/${Url}`, Promise<Wrap<Ret>>, Prm>,
						handler: jsonHandler(fn, true /* wrap json results */),
						url,
						method,
					})
				})
			})
		})
	}
}
/** Fluent query-based endpoint factory */
export function queryRoute<M extends QueryMethod>(method: M) {
	return {
		url: <Url extends string>(url: Url) => ({
			queryType: <Query extends Json<string>>() => ({
				returnType: <Ret extends JsonRet>() => ({
					handler: (fn: QueryProxy<Query, Url, Promise<Ret>>) => ({
						method,
						url,
						handler: jsonHandler(fn, true /* wrap json results */),
						proxyFactory: <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) =>
							proxy[method.toLowerCase() as Lowercase<QueryMethod>]
								.route(applyParams(`${baseUrl}/${url}`, params))
								.queryType<Query>()
								.returnType<Wrap<Ret>>() as QueryProxy<Query, `${BaseUrl}/${Url}`, Promise<Wrap<Ret>>, Prm>
					})
				})
			}),
			headersType: <Headers extends Json<string>>() => ({
				returnType: <Ret extends JsonRet>() => ({
					handler: (fn: QueryProxy<Headers, Url, Promise<Ret>>) => ({
						method,
						url,
						handler: jsonHandler(fn, true /* wrap json results */),
						proxyFactory: <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) =>
							proxy[method.toLowerCase() as Lowercase<QueryMethod>]
								.route(applyParams(`${baseUrl}/${url}`, params))
								.headersType<Headers>()
								.returnType<Wrap<Ret>>() as QueryProxy<Headers, `${BaseUrl}/${Url}`, Promise<Wrap<Ret>>, Prm>
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

/** Creates a client final route based on a server route */
export function clientRoute<QuryBdy, M extends Method, Url extends string, bUrl extends string, Prm extends Partial<Params<`${bUrl}/${Url}`>>, Ret extends JsonRet>(
	endpoint: Route<M, Url, QuryBdy, Ret>,
	baseUrl: bUrl,
	params: Prm
) {
	const proxy = endpoint.proxyFactory(baseUrl, params)
	return {
		method: endpoint.method,
		url: applyParams(endpoint.route, params as any),
		handler: jsonHandler(proxy),
		proxy: proxy
	} as RouteFinal<M, QuryBdy & Omit<Params<`${bUrl}/${Url}`>, keyof Prm>, Ret>
}

export type Route<M extends Method = Method, Url extends string = string, QueryBody = any, Ret extends JsonRet = JsonRet> = {
	proxyFactory: <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(url: BaseUrl, params: Prm) =>
		Proxy<QueryBody, `${BaseUrl}/${Url}`, Promise<Wrap<Ret>>, Prm>;
	handler: express.Handler;
	route: Url;
	method: M;
}

export type RouteFinal<M extends Method = Method, Args = any, Ret extends JsonRet = JsonRet> = {
	proxy: (args: Args) => Promise<Wrap<Ret>>;
	handler: express.Handler;
	url: string;
	method: M;
}

type RequestUrlInfo = { url: string, baseUrl: string, originalUrl: string }
type Wrap<T> = ({ data: T } | { error: string })
type JsonRet = Json | JsonArray | null

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

// eslint-disable-next-line fp/no-let, init-declarations, @typescript-eslint/no-unused-vars
/*let e: EndpointFinal<"GET", Omit<ExtractParams<`${"BaseUrl"}/${"/:Route"}`>, keyof {}>, { x: number }>
const verify = endpoint
	.post
	.url("/:app/verify")
	.bodyType<{ emailAddress: string, verificationCode: string, accessLevel: number }>()
	.returnType<User>()
	.handler<{ getAsync: Function }>(db => (async (args) => {
		const { emailAddress, verificationCode, accessLevel } = args
		const users = await db.getAsync("users", {
			filters: [
				{ fieldName: "emailAdress", operator: "equals", value: emailAddress },
				{ fieldName: "verificationCode", operator: "equals", value: verificationCode }
			]
		})
		console.log(`Users matching verification found: ${stringify(users)}`)

		if (users.length > 0) {
			const updatedUser = {
				...users[0],
				whenVerified: Date.now(),
				...(accessLevel ? { accessLevel: accessLevel } : {}
				)
			} as User
			await db.updateAsync("usersReadonly", updatedUser)
			return sanitizeUser(updatedUser)
		}
		else {
			throw (statusCodes.NOT_FOUND.toString())
		}
	}))

const { method, route, handlerFactory, proxyFactory } = verify
const verifyClient = clientEndpoint(verify, "authURL", { app: "" })
type User = {
	id: string,
	displayName: string,
	emailAddress: string,
	companyName: string,
	accessLevel: number,
	whenVerified?: number,
	app: string
}
*/