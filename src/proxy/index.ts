import { Obj, pick, keys } from "@agyemanjp/standard"
import { ExtractParams, Json, BodyType, MIME_TYPES, JsonArray, ObjEmpty } from "../common"
import { request } from "../client"

/** Fluent proxy factory */
export const proxy = {
	get: queryProxy("get"),
	delete: queryProxy("delete"),
	post: bodyProxy("post"),
	patch: bodyProxy("patch"),
	put: bodyProxy("put"),
}

/** Fluent query-based proxy factory */
export function queryProxy(method: "get" | "delete") {
	return {
		route: <Route extends string>(url: Route) => ({
			queryType: <Query extends Json<string>>() => ({
				returnType: <Res extends Json>() =>
					async (args: Query & ExtractParams<Route>) =>
						request[method]<Res>({ url, ...parseArgs(url, args, "query"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Query & ExtractParams<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "query"), accept })
			}),
			headersType: <Headers extends Json<string>>() => ({
				returnType: <Ret extends Json>() =>
					async (args: Headers & ExtractParams<Route>) =>
						request[method]<Ret>({ url, ...parseArgs(url, args, "headers"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Headers & ExtractParams<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "headers"), accept })
			})
		})
	}
}
/** Fluent body-based proxy factory */
export function bodyProxy(method: "post" | "put" | "patch") {
	return {
		route: <Route extends string>(url: Route) => ({
			bodyType: <Body extends BodyType>() => ({
				returnType: <Ret extends Json>() =>
					async (args: Body & ExtractParams<Route>) =>
						request[method]<Ret>({ url, ...parseArgs(url, args, "body"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Body & ExtractParams<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "body"), accept })
			})
		})
	}
}

export type BodyProxy<Body extends Json | JsonArray, Route extends string, Ret, Params extends Partial<ExtractParams<Route>> = ObjEmpty> =
	(args: Body & Exclude<ExtractParams<Route>, Params>) => Ret
export type QueryProxy<Query extends Json<string>, Route extends string, Ret, Params extends Partial<ExtractParams<Route>> = ObjEmpty> =
	(args: Query & Exclude<ExtractParams<Route>, Params>) => Ret
export type Proxy<Args extends Json<string>, Route extends string, Ret, Params extends Partial<ExtractParams<Route>> = ObjEmpty> =
	(args: Args & Exclude<ExtractParams<Route>, Params>) => Ret

function parseArgs<R extends string, Q extends Json<string>>(url: R, args: Q & ExtractParams<R>, kind: "query"): { query: Q, params: ExtractParams<R> }
function parseArgs<R extends string, H extends Json<string>>(url: R, args: H & ExtractParams<R>, kind: "headers"): { headers: H, params: ExtractParams<R> }
function parseArgs<R extends string, B extends Json<string>>(url: R, args: B & ExtractParams<R>, kind: "body"): { body: B, params: ExtractParams<R> }
function parseArgs<R extends string, T extends Json<string>>(url: R, args: T & ExtractParams<R>, kind: "query" | "headers" | "body") {
	return {
		[kind]: pick(args, ...keys(args).filter(k => !url.includes(`/:${k}/`))) as any,
		params: pick(args, ...keys(args).filter(k => url.includes(`/:${k}/`))) as any as ExtractParams<R>
	}
}

type MIMETypeKey = keyof typeof MIME_TYPES

// const proxyGet = proxy.get.route("/projects/:api").queryType<{ category: string }>().responseType("Text")
// const g = proxyGet({ category: "cat", api: "nxthaus" })

// const proxyPost = proxy.post.route("/projects/:api").bodyType<{ category: string }>().returnType<{ x: number }>()
// const p = proxyPost({ category: "cat", api: "nxthaus" })