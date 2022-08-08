/* eslint-disable fp/no-rest-parameters */
/* eslint-disable fp/no-mutating-assign */
/* eslint-disable indent */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable fp/no-proxy */
/* eslint-disable fp/no-unused-expression */
/* eslint-disable no-shadow */
// import * as express from 'express'
import { keys, Obj, pick, isWhitespace, trimRight, trimLeft } from '@agyemanjp/standard'

import { JsonObject, statusCodes, Method as HttpMethod, applyParams, ParamsObj, Json, AcceptType, BodyMethod, QueryMethod } from "./common"
import { request, TResponse, ResponseDataType } from './client'


function pathJoin(a: string, b: string) {
	if (isWhitespace(a))
		return b
	else if (isWhitespace(b))
		return a
	else
		return trimRight(a, "/") + "/" + trimLeft(b, "/")
}

/** Fluent body route factory */
export function bodyFactory<M extends BodyMethod>(method: Lowercase<M>) {
	return {
		url: <Url extends string>(url: Url) => ({
			bodyType: <Bdy extends Json>() => ({
				headersType: <Hdrs extends sJson>() => ({
					returnType: <Ret extends Json | null>() => {
						type Args = ParamsObj<Url> & Bdy & Hdrs
						const proxyFactory: ProxyFactory<Args, Ret> = (baseUrl, argsInjected) => {
							const urlEffective = applyParams(pathJoin(baseUrl, url), argsInjected)
							console.log(`Base url of proxy: "${baseUrl}"`)
							console.log(`Effective url requested from proxy: "${urlEffective}"`)

							return async (args: Omit<Args, keyof typeof argsInjected>) => request[method]<Wrap<Ret>>({
								url: urlEffective,
								...parseBodyArgs(urlEffective, { ...args, ...argsInjected }),
								accept: "Json"
							}).then(wrapped => {
								if ("data" in wrapped)
									return wrapped.data
								else
									throw wrapped.error
							})
						}
						return Object.assign(proxyFactory("", {}),
							{
								method,
								url,
								proxyFactory,
								route: (handlerFn: Proxy<Args, Ret>) => ({
									method,
									url,
									handler: jsonHandler(handlerFn, true)
								})
							} //as ProxyFactoryAugmented<Args, Ret, M>,
						)
					},
					responseType: <Accept extends AcceptType>(accept: Accept) => {
						type Args = ParamsObj<Url> & Bdy & Hdrs
						const proxyFactory: ProxyFactory<Args, TResponse<Accept>> = (baseUrl, argsInjected) => {
							const urlEffective = applyParams(pathJoin(baseUrl, url), argsInjected)
							console.log(`Base url of proxy: "${baseUrl}"`)
							console.log(`Effective url requested from proxy: "${urlEffective}"`)

							return async (args: Omit<Args, keyof typeof argsInjected>) => request[method]({
								url: urlEffective,
								...parseBodyArgs(urlEffective, { ...args, ...argsInjected }),
								accept
							})
						}
						return Object.assign(proxyFactory("", {}),
							{
								proxyFactory,
								// proxy: proxyFactory("", {}),
								method,
								url,
								route: (handlerFn: Proxy<Args, TResponse<Accept>>) => ({
									method,
									url,
									handler: jsonHandler(handlerFn, true)
								})
							}
						)
					}
				})
			})
		})
	}
}

/** Fluent query route factory */
export function queryFactory<M extends QueryMethod>(method: Lowercase<M>) {
	return {
		url: <Url extends string>(url: Url) => ({
			queryType: <Qry extends sJson>() => ({
				headersType: <Hdrs extends sJson>() => ({
					returnType: <Ret extends Json | null>() => {
						type Args = ParamsObj<Url> & Qry & Hdrs
						const proxyFactory: ProxyFactory<Args, Ret> = (baseUrl, argsInjected) => {
							const urlEffective = applyParams(pathJoin(baseUrl, url), argsInjected)
							console.log(`Base url of proxy: "${baseUrl}"`)
							console.log(`Effective url requested from proxy: "${urlEffective}"`)

							return async (args: Omit<Args, keyof typeof argsInjected>) => request[method]<Wrap<Ret>>({
								url: urlEffective,
								...parseQueryArgs(urlEffective, { ...args, ...argsInjected }),
								accept: "Json"
							}).then(wrapped => {
								if ("data" in wrapped)
									return wrapped.data
								else
									throw wrapped.error
							})
						}
						return Object.assign(proxyFactory("", {}),
							{
								proxyFactory,
								method,
								url,
								route: (handlerFn: Proxy<Args, Ret>) => ({
									method,
									url,
									handler: jsonHandler(handlerFn, true)
								})
							}
						)
					},
					responseType: <Accept extends AcceptType>(accept: Accept) => {
						type Args = ParamsObj<Url> & Qry & Hdrs
						const proxyFactory: ProxyFactory<Args, TResponse<Accept>> = (baseUrl, argsInjected) => {
							const urlEffective = applyParams(pathJoin(baseUrl, url), argsInjected)
							console.log(`Base url of proxy: "${baseUrl}"`)
							console.log(`Effective url requested from proxy: "${urlEffective}"`)

							return async (args: Omit<Args, keyof typeof argsInjected>) => request[method]({
								url: urlEffective,
								...parseQueryArgs(urlEffective, { ...args, ...argsInjected }),
								accept
							})
						}
						return Object.assign(proxyFactory("", {}),
							{
								proxyFactory,
								method,
								url,
								route: (handlerFn: Proxy<Args, TResponse<Accept>>) => ({
									method,
									url,
									handler: jsonHandler(handlerFn, true)
								})
							}
						)
					}
				})
			})
		})
	}
}

/** Create handler accepting typed JSON data (in query, params, header, and/or body) and returning JSON data */
export function jsonHandler<QryHdrsBdy, Ret>(fn: (req: QryHdrsBdy & RequestUrlInfo) => Promise<Ret>, wrap = false) {
	return async (req:
		{
			body: QryHdrsBdy & RequestUrlInfo;
			query: QryHdrsBdy & RequestUrlInfo;
			headers: QryHdrsBdy & RequestUrlInfo;
			params: QryHdrsBdy & RequestUrlInfo;
			url: any;
			baseUrl: any;
			originalUrl: any
		},
		res:
			{
				status: (arg0: number) => {
					(): any; new(): any;
					json: { (arg0: Awaited<Ret> | { data: Awaited<Ret> }): void; new(): any };
					send: { (arg0: unknown): void; new(): any }
				}
			}) => {
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

/** Creates a client route based on a server route */
export function clientProxy<Mthd extends HttpMethod, QryHdrsBdyParams extends Json, Ret extends Json, A extends Partial<QryHdrsBdyParams>>(
	// route: RouteObject<Mthd, QryHdrsBdyParams, Ret>,
	proxyFactoryAumented: ProxyFactoryAugmented<QryHdrsBdyParams, Ret, Mthd>,
	baseUrl: string,
	injectedArgs: A
) {

	const proxy = proxyFactoryAumented.proxyFactory(baseUrl, injectedArgs)
	const proxtFactoryAug = Object.assign(proxy, {
		method: proxyFactoryAumented.method,
		url: applyParams(proxyFactoryAumented.url, injectedArgs),
		proxyFactory: ((baseUrlNew, argsNew) => {
			const mergedArgs = { ...argsNew, ...injectedArgs } as Partial<QryHdrsBdyParams>
			return proxyFactoryAumented.proxyFactory(`${baseUrlNew}/${baseUrl}`, mergedArgs)
		}) as ProxyFactory<Omit<QryHdrsBdyParams, keyof A>, Ret>,
	}) //as ProxyFactoryAugmented<Omit<QryHdrsBdyParams, keyof A>, Ret, Mthd>

	return Object.assign(proxtFactoryAug, {
		handler: jsonHandler(proxy)
	})
}


export type QueryProxy<Url extends string, Qry extends sJson, Hdrs extends sJson, Ret extends ResponseDataType> = (
	(args: ParamsObj<Url> & Qry & Hdrs) => Promise<Ret>
)
export type BodyProxy<Url extends string, Bdy extends Json, Hdrs extends sJson, Ret extends ResponseDataType> = (
	(args: ParamsObj<Url> & Bdy & Hdrs) => Promise<Ret>
)

export type Proxy<Args extends Json, Ret extends ResponseDataType> = (args: Args) => Promise<Ret>

export type ProxyFactory<Args extends Json, Ret extends ResponseDataType> = (
	<A extends Partial<Args>>(baseUrl: string, args: A) =>
		(args: Omit<Args, keyof A>) =>
			Promise<Ret>
)

export type ProxyFactoryAugmented<Args extends Json, Ret extends ResponseDataType, M extends HttpMethod> = (
	Proxy<Args, Ret> & {
		proxyFactory: ProxyFactory<Args, Ret>;
		// proxy: Proxy<Args, Ret>;
		method: Lowercase<M>;
		url: string;
		// route: (handler: Proxy<QryHdrsBdyParams, Ret>) => RouteObject<HttpMethod>;
	})


/** Parse various categories of properties out of a query arguments object 
 * By conention header property names must be prefixed with an underscore _
 */
function parseQueryArgs(url: string, args: sJson) {
	return {
		query: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`))),
		headers: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`) && k.startsWith("_"))),
		params: pick(args, ...keys(args).filter(k => url.includes(`/:${k}/`)))
	}
}
/** Parse various categories of properties out of a body arguments object
 * By conention header property names must be prefixed with an underscore _
 */
function parseBodyArgs(url: string, _args: Json) {
	const args = _args as Obj
	return {
		body: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`))) as Json,
		headers: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`) && k.startsWith("_"))) as sJson,
		params: pick(args, ...keys(args).filter(k => url.includes(`/:${k}/`))) as sJson
	}
}

type RequestUrlInfo = { url: string, baseUrl: string, originalUrl: string }
type Wrap<T> = ({ data: T } | { error: string })
// type MIMETypeKey = keyof typeof MIME_TYPES
type sJson = JsonObject<string>

