/* eslint-disable fp/no-proxy */
/* eslint-disable fp/no-mutating-assign */
import { Obj, pick, keys } from "@agyemanjp/standard"
import { Params, Json, JsonObject, JsonArray, BodyType, MIME_TYPES, ObjEmpty, Method, applyParams } from "../common"
import { request } from "../client"


export function queryProxyFactory(method: "get" | "delete") {
	return {
		url: <Url extends string>(url: Url) => ({
			queryType: <Query extends JsonObject<string>>() => ({
				returnType: <Ret extends Json>() => {
					const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
						const urlEffective = applyParams(`${baseUrl}/${url}`, params)
						return async (args: Query & Omit<Params<Url>, keyof Prm>) => request[method]<Ret>({
							url: urlEffective,
							...parseArgs(urlEffective, args as any, "query"),
							accept: "Json"
						})
					}
					return Object.assign(factory, { proxy: factory("", {}), method, url })
				},

				responseType: <Accept extends MIMETypeKey>(accept: Accept) => {
					const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
						const urlEffective = applyParams(`${baseUrl}/${url}`, params)
						return async (args: Query & Omit<Params<Url>, keyof Prm>) => request[method]({
							url: urlEffective,
							...parseArgs(urlEffective, args, "query"),
							accept
						})
					}
					return Object.assign(factory, { proxy: factory("", {}), method, url })
				}
			}),
			headersType: <Headers extends JsonObject<string>>() => ({
				returnType: <Ret extends Json>() => {
					const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
						const urlEffective = applyParams(`${baseUrl}/${url}`, params)
						return async (args: Headers & Omit<Params<Url>, keyof Prm>) => request[method]<Ret>({
							url: urlEffective,
							...parseArgs(urlEffective, args as any, "headers"),
							accept: "Json"
						})
					}
					return Object.assign(factory, { proxy: factory("", {}), method, url })
				},

				responseType: <Accept extends MIMETypeKey>(accept: Accept) => {
					const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
						const urlEffective = applyParams(`${baseUrl}/${url}`, params)
						return async (args: Headers & Omit<Params<Url>, keyof Prm>) => request[method]({
							url: urlEffective,
							...parseArgs(urlEffective, args, "headers"),
							accept
						})
					}
					return Object.assign(factory, { proxy: factory("", {}), method, url })
				}
			})
		})
	}
}

// const xx = queryProxyFactory("get").url("").queryType<{}>().returnType<{}>().

export function bodyProxyFactory(method: "post" | "put" | "patch") {
	return {
		url: <Url extends string>(url: Url) => ({
			bodyType: <Bdy extends Json>() => {
				return {
					returnType: <Ret extends Json>() => {
						const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
							const urlEffective = applyParams(`${baseUrl}/${url}`, params)
							return async (args: Bdy & Omit<Params<Url>, keyof Prm>) => request[method]<Ret>({
								url: urlEffective,
								...parseArgs(urlEffective, args as any, "body"),
								accept: "Json"
							})
						}
						return Object.assign(factory, { proxy: factory("", {}), method, url })
					},
					responseType: <Accept extends MIMETypeKey>(accept: Accept) => {
						const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
							const urlEffective = applyParams(`${baseUrl}/${url}`, params)
							return async (args: Bdy & Omit<Params<Url>, keyof Prm>) => request[method]({
								url: urlEffective,
								...parseArgs(urlEffective, args as any, "body"),
								accept
							})
						}
						return Object.assign(factory, { proxy: factory("", {}), method, url })
					}
				}
			}
		})
	}
}

export type BodyProxy<Bdy extends JsonObject | JsonArray, Url extends string, Ret, Prm extends Partial<Params<Url>> = ObjEmpty> =
	(args: Bdy & Omit<Params<Url>, keyof Prm>) => Ret
export type QueryProxy<Qry extends JsonObject<string>, Url extends string, Ret, Prm extends Partial<Params<Url>> = ObjEmpty> =
	(args: Qry & Omit<Params<Url>, keyof Prm>) => Ret
export type Proxy<QueryBody, Url extends string, Ret, Prm extends Partial<Params<Url>> = ObjEmpty> =
	(args: QueryBody & Omit<Params<Url>, keyof Prm>) => Ret
export type ProxyFactory<QueryBody, Url extends string, Ret> = { method: Lowercase<Method>, url: Url } & (
	<BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) =>
		(args: QueryBody & Omit<Params<Url>, keyof Prm>) => Ret
)

function parseArgs<R extends string, Q extends JsonObject<string>>(url: R, args: Q & Params<R>, kind: "query"): { query: Q, params: Params<R> }
function parseArgs<R extends string, H extends JsonObject<string>>(url: R, args: H & Params<R>, kind: "headers"): { headers: H, params: Params<R> }
function parseArgs<R extends string, B extends JsonObject>(url: R, args: B & Params<R>, kind: "body"): { body: B, params: Params<R> }
function parseArgs<R extends string, T extends JsonObject<string>>(url: R, args: T & Params<R>, kind: "query" | "headers" | "body") {
	return {
		[kind]: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`))) as any,
		params: pick(args, ...keys(args).filter(k => url.includes(`/:${k}/`))) as any as Params<R>
	}
}

type MIMETypeKey = keyof typeof MIME_TYPES

// const proxyGet = proxy.get.route("/projects/:api").queryType<{ category: string }>().responseType("Text")
// const g = proxyGet({ category: "cat", api: "nxthaus" })

// const proxyPost = proxy.post.route("/projects/:api").bodyType<{ category: string }>().returnType<{ x: number }>()
// const p = proxyPost({ category: "cat", api: "nxthaus" })



/*export function bodyProxyFactory__(method: "post" | "put" | "patch") {
	return {
		url: <Url extends string>(url: Url) => ({
			bodyType: <Bdy extends BodyType>() => {
				return {
					returnType: <Ret extends Json>() => {
						const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
							const urlEffective = applyParams(`${baseUrl}/${url}`, params)
							return async (args: Bdy & Omit<Params<Url>, keyof Prm>) => request[method]<Ret>({
								url: urlEffective,
								...parseArgs(urlEffective, args, "body"),
								accept: "Json"
							})
						}
						return Object.assign(factory, { proxy: factory("", {}), method, url })
					},
					responseType: <Accept extends MIMETypeKey>(accept: Accept) => {
						const factory = <BaseUrl extends string, Prm extends Partial<Params<`${BaseUrl}/${Url}`>>>(baseUrl: BaseUrl, params: Prm) => {
							const urlEffective = applyParams(`${baseUrl}/${url}`, params)
							return async (args: Bdy & Params<Url>) => request[method]({
								url: urlEffective,
								...parseArgs(urlEffective, args, "body"),
								accept
							})
						}
						return Object.assign(factory, { proxy: factory("", {}), method, url })
					}
				}
			}
		})
	}
}*/


/** Fluent proxy factory */
// export const proxy = {
// 	get: queryProxy("get"),
// 	delete: queryProxy("delete"),
// 	post: bodyProxy("post"),
// 	patch: bodyProxy("patch"),
// 	put: bodyProxy("put"),
// }

/** Fluent query-based proxy factory */
// export function queryProxy(method: "get" | "delete") {
// 	return {
// 		route: <Route extends string>(url: Route) => ({
// 			queryType: <Query extends Json<string>>() => ({
// 				returnType: <Res extends Json>() =>
// 					async (args: Query & Params<Route>) =>
// 						request[method]<Res>({ url, ...parseArgs(url, args, "query"), accept: "Json" }),
// 				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
// 					async (args: Query & Params<Route>) =>
// 						request[method]({ url, ...parseArgs(url, args, "query"), accept })
// 			}),
// 			headersType: <Headers extends Json<string>>() => ({
// 				returnType: <Ret extends Json>() =>
// 					async (args: Headers & Params<Route>) =>
// 						request[method]<Ret>({ url, ...parseArgs(url, args, "headers"), accept: "Json" }),
// 				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
// 					async (args: Headers & Params<Route>) =>
// 						request[method]({ url, ...parseArgs(url, args, "headers"), accept })
// 			})
// 		})
// 	}
// }

/** Fluent body-based proxy factory */
// export function bodyProxy(method: "post" | "put" | "patch") {
// 	return {
// 		route: <Route extends string>(url: Route) => ({
// 			bodyType: <Bdy extends BodyType>() => ({
// 				returnType: <Ret extends Json>() =>
// 					async (args: Bdy & Params<Route>) =>
// 						request[method]<Ret>({ url, ...parseArgs(url, args, "body"), accept: "Json" }),
// 				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
// 					async (args: Bdy & Params<Route>) =>
// 						request[method]({ url, ...parseArgs(url, args, "body"), accept })
// 			})
// 		})
// 	}
// }
