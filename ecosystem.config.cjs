module.exports = {
    apps: [{
        name: 'Remote-Commander-Prod',
        script: 'npm',
        args: 'start',
        instances: 'max',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production'
        },
    }]
}
