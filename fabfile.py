from fabric.api import env, local, require


def lserver():
    local('nodemon app.js')


def deploy():
    """fab [environment] deploy"""
    require('environment')
    maintenance_on()
    push()
    maintenance_off()
    ps()


def maintenance_on():
    """fab [environment] maintenance_on"""
    require('environment')
    local('heroku maintenance:on --remote %s' % env.environment)


def maintenance_off():
    """fab [environment] maintenance_off"""
    require('environment')
    local('heroku maintenance:off --remote %s' % env.environment)


def push():
    """fab [environment] push"""
    require('environment')
    local('git push %s %s:master' % (env.environment, env.branch))


def ps():
    """fab [environment] ps"""
    require('environment')
    local('heroku ps --remote %s' % env.environment)


def open():
    """fab [environment] open"""
    require('environment')
    local('heroku open --remote %s' % env.environment)


def dev():
    """fab dev [command]"""
    env.environment = 'dev'
    env.branch = 'dev'


def staging():
    """fab staging [command]"""
    env.environment = 'staging'
    env.branch = 'staging'


def prod():
    """fab prod [command]"""
    env.environment = 'prod'
    env.branch = 'master'
