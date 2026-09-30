const isQuanX = typeof $task !== 'undefined'
const StatusText = isQuanX ? 'HTTP/1.1 302 Redirect' : 302
const CDN_HOST = 'cdn.jsdelivr.net'

function decodePart(value) {
    try { return decodeURIComponent(value) } catch (_) { return null }
}

function hasTokenQuery(query) {
    if (!query) return false
    return query.slice(1).split('&').some(part => {
        const key = decodePart(part.split('=')[0].replace(/\+/g, ' '))
        // Malformed query keys and encoded/case-varied credentials stay on Raw.
        return key === null || /^(?:token|access_token|authorization)$/i.test(key)
    })
}

function rewrite(url) {
    if (typeof url !== 'string') return null
    // Anchor the entire URL. No userinfo, suffix hosts, ports or empty segments.
    const match = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/?#]+)\/([^/?#]+)\/([^/?#]+)\/([^?#]+)(\?[^#]*)?(?:#[^\r\n]*)?$/i)
    if (!match) return null
    let [, user, repo, branch, path, query] = match
    if (hasTokenQuery(query)) return null
    if (!/^[a-z0-9_-]+$/i.test(user) || !/^[a-z0-9_.-]+$/i.test(repo) || repo === '.' || repo === '..') return null

    if (branch === 'refs') {
        const ref = path.match(/^(?:heads|tags)\/([^/]+)\/(.+)$/)
        if (!ref) return null
        ;[, branch, path] = ref
    }

    const decodedBranch = decodePart(branch)
    // An encoded slash is not evidence of an unambiguous ref/path boundary.
    // Keep it on Raw rather than passing a differently interpreted ref to CDN.
    if (!decodedBranch || /[/\\?#@%\s\x00-\x1f\x7f]/.test(decodedBranch) || decodedBranch === '.' || decodedBranch === '..') return null
    const parts = path.split('/')
    if (parts.some(part => {
        const decoded = decodePart(part)
        return !decoded || decoded === '.' || decoded === '..' || /[/\\?#\x00-\x1f\x7f]/.test(decoded) || /%2f|%5c/i.test(decoded)
    })) return null

    // Compatibility: retain the historical first-segment ref heuristic for
    // ordinary URLs, including refs/heads/main/dir/file. An unencoded slash in
    // a branch/tag name is inherently ambiguous here and is NOT resolved.
    // Pin to a full commit SHA when exact identity matters. No network lookup.
    return `https://${CDN_HOST}/gh/${user}/${repo}@${branch}/${path}`
}

function hasAuthHeader(headers) {
    if (!headers) return false
    // Script engines normally provide an object; also accept standard Headers.
    if (typeof headers.has === 'function' && headers.has('authorization')) return true
    return Object.keys(headers).some(key => key.toLowerCase() === 'authorization')
}

const isGet = !$request.method || $request.method === 'GET'
const cdnUrl = isGet && !hasAuthHeader($request.headers) ? rewrite($request.url) : null
if (cdnUrl) {
    const response = { status: StatusText, headers: { Location: cdnUrl } }
    $done(isQuanX ? response : { response })
} else {
    $done({})
}
