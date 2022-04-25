import { Obj, pick, keys } from "@agyemanjp/standard"
import { Params, Json, BodyType, MIME_TYPES, JsonArray, ObjEmpty } from "../common"
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
					async (args: Query & Params<Route>) =>
						request[method]<Res>({ url, ...parseArgs(url, args, "query"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Query & Params<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "query"), accept })
			}),
			headersType: <Headers extends Json<string>>() => ({
				returnType: <Ret extends Json>() =>
					async (args: Headers & Params<Route>) =>
						request[method]<Ret>({ url, ...parseArgs(url, args, "headers"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Headers & Params<Route>) =>
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
					async (args: Body & Params<Route>) =>
						request[method]<Ret>({ url, ...parseArgs(url, args, "body"), accept: "Json" }),
				responseType: <Accept extends MIMETypeKey>(accept: Accept) =>
					async (args: Body & Params<Route>) =>
						request[method]({ url, ...parseArgs(url, args, "body"), accept })
			})
		})
	}
}

export type BodyProxy<Bdy extends Json | JsonArray, Url extends string, Ret, Prm extends Partial<Params<Url>> = ObjEmpty> =
	(args: Bdy & Omit<Params<Url>, keyof Prm>) => Ret
export type QueryProxy<Qry extends Json<string>, Url extends string, Ret, Prm extends Partial<Params<Url>> = ObjEmpty> =
	(args: Qry & Omit<Params<Url>, keyof Prm>) => Ret
export type Proxy<QueryBody, Url extends string, Ret, Prm extends Partial<Params<Url>> = ObjEmpty> =
	(args: QueryBody & Omit<Params<Url>, keyof Prm>) => Ret

function parseArgs<R extends string, Q extends Json<string>>(url: R, args: Q & Params<R>, kind: "query"): { query: Q, params: Params<R> }
function parseArgs<R extends string, H extends Json<string>>(url: R, args: H & Params<R>, kind: "headers"): { headers: H, params: Params<R> }
function parseArgs<R extends string, B extends Json<string>>(url: R, args: B & Params<R>, kind: "body"): { body: B, params: Params<R> }
function parseArgs<R extends string, T extends Json<string>>(url: R, args: T & Params<R>, kind: "query" | "headers" | "body") {
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