// policies/forceSSL.js

module.exports = function (req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect([
            'https://',
            req.get('Host'),
            req.url
        ].join(''));
    } else {
        next();
    }
}