const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { runInNewContext } = require('node:vm')
const source = readFileSync(resolve(__dirname, '../index.js'), 'utf8')

function run(path, extra = {}, quanX = false) {
    const request = { url: 'https://raw.githubusercontent.com/owner/repo/' + path, method: 'GET', ...extra }
    let calls = 0, output
    const context = { $request: request, $done: value => { calls++; output = value }, Headers }
    if (quanX) context.$task = {}
    runInNewContext(source, context, { timeout: 1000 })
    assert.equal(calls, 1, '$done must be called exactly once')
    return JSON.parse(JSON.stringify(output))
}
function redirect(path, target) {
    assert.deepEqual(run(path), { response: { status: 302, headers: { Location: 'https://cdn.jsdelivr.net/gh/owner/repo@' + target } } })
}

for (const [path, target] of [
    ['main/index.js', 'main/index.js'],
    ['main/dir/nested/file.js', 'main/dir/nested/file.js'],
    ['refs/heads/main/dir/file.js', 'main/dir/file.js'],
    ['refs/tags/v1.2.3/dist/index.js', 'v1.2.3/dist/index.js'],
    ['v1.2.3/index.js', 'v1.2.3/index.js'],
    ['32b00373b3f42e5cdcb709df53f3b08b7184a944/dir/index.js', '32b00373b3f42e5cdcb709df53f3b08b7184a944/dir/index.js'],
    ['main/hello%20world.js', 'main/hello%20world.js'],
    ['main/index.js?download=1&cache=2#fragment', 'main/index.js'],
]) test('preserves rewrite: ' + path, () => redirect(path, target))

for (const path of [
    'feature%2Fname/index.js', 'refs/heads/feature%2fname/index.js',
    'refs/tags/release%2Fv1/index.js', 'feature%252fname/index.js',
    'refs/heads/main', 'refs/heads//index.js', 'refs/pull/1/head/index.js',
    'refs/bogus/main/index.js', 'main/', 'main//file.js',
    'main/../file.js', 'main/%2e%2e/file.js', 'main/dir%2Ffile.js',
    'main/%5cfile.js', 'main/%252ffile.js', 'main/file%0d%0a.js',
    'main/%invalid.js', '%invalid/index.js', 'a@b/index.js',
    'main/index.js?token=abc', 'main/index.js?TOKEN=abc',
    'main/index.js?%74oken=abc', 'main/index.js?download=1&ToKeN=abc',
    'main/index.js?access_token=abc', 'main/index.js?authorization=abc',
    'main/index.js?token', 'main/index.js?%invalid=abc',
]) test('passes through: ' + path, () => assert.deepEqual(run(path), {}))

for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'get']) {
    test('non-GET stays unchanged: ' + method, () => assert.deepEqual(run('main/index.js', { method }), {}))
}
for (const name of ['Authorization', 'authorization', 'AUTHORIZATION', 'aUtHoRiZaTiOn']) {
    test('authorization stays unchanged: ' + name, () => assert.deepEqual(run('main/index.js', { headers: { [name]: 'Bearer private' } }), {}))
}
test('standard Headers authentication stays unchanged', () => assert.deepEqual(run('main/index.js', { headers: new Headers({ Authorization: 'secret' }) }), {}))
test('absent method retains existing GET compatibility', () => assert.equal(run('main/index.js', { method: undefined }).response.status, 302))
test('unrelated headers do not alter public rewrite', () => assert.equal(run('main/index.js', { headers: { Accept: '*/*' } }).response.status, 302))
test('QuanX response shape and exact status', () => assert.deepEqual(run('main/index.js', {}, true), { status: 'HTTP/1.1 302 Redirect', headers: { Location: 'https://cdn.jsdelivr.net/gh/owner/repo@main/index.js' } }))
test('QuanX passthrough shape', () => assert.deepEqual(run('main/index.js?token=abc', {}, true), {}))
for (const url of [
    'https://raw.githubusercontent.com.evil.example/owner/repo/main/index.js',
    'https://evil.example/raw.githubusercontent.com/owner/repo/main/index.js',
    'https://user:secret@raw.githubusercontent.com/owner/repo/main/index.js',
    'https://raw.githubusercontent.com:443/owner/repo/main/index.js',
    'https://raw.githubusercontent.com/owner/repo/main/index.js\nignored',
    'file://raw.githubusercontent.com/owner/repo/main/index.js',
    'https://raw.githubusercontent.com/owner/repo@other/main/index.js',
]) test('invalid host/URL passes through: ' + url, () => assert.deepEqual(run('', { url }), {}))

// Regression documentation, not a claim of correctness for slash-named refs.
test('known limitation: unencoded slash branch retains legacy split', () => {
    redirect('refs/heads/feature/topic/file.js', 'feature/topic/file.js')
    redirect('feature/topic/file.js', 'feature/topic/file.js')
})
