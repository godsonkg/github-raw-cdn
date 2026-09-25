const isQuanX = typeof $task !== 'undefined'

const StatusText = isQuanX ? 'HTTP/1.1 302 Redirect' : 302
const CDN_HOST = 'cdn.jsdelivr.net'

function rewrite(url) {
    const match = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/([^?#]*)(\?[^#]*)?/)
    if (!match) return null
    let [, user, repo, branch, path, query] = match
    // GitHub 新版 Raw 链接形如 /refs/heads/main/xxx，换成 jsDelivr 认的 @main/xxx
    const ref = branch === 'refs' && path.match(/^(?:heads|tags)\/([^/]+)\/(.*)$/)
    if (ref) [, branch, path] = ref
    // 私有仓库的 raw 链接带 token，jsDelivr 拿不到，转过去只会 404 还会泄露 token
    if (query && /[?&]token=/.test(query)) return null
    return `https://${CDN_HOST}/gh/${user}/${repo}@${branch}/${path}`
}

function hasAuthHeader(headers) {
    return Object.keys(headers || {}).some(k => k.toLowerCase() === 'authorization')
}

const isGet = !$request.method || $request.method === 'GET'
const cdnUrl = isGet && !hasAuthHeader($request.headers) ? rewrite($request.url) : null
if (cdnUrl) {
    const response = { status: StatusText, headers: { Location: cdnUrl } }
    $done(isQuanX ? response : { response })
} else {
    $done({})
}
