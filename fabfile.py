from fabric.api import env, settings, cd, run, sudo

env.user = 'janerist'
env.hosts = ['achtung.janerist.net']

REPO = 'http://github.com/janerist/achtung5.git'
APP_DIR = '/home/janerist/apps/achtung5'


def deploy():
    sync_changes()
    with cd(APP_DIR):
        run('npm install')
        run('npm test')

    sudo('supervisorctl restart achtung5')


def sync_changes():
    with settings(warn_only=True):
        app_exists = not run('test -d %s' % APP_DIR).failed

    if not app_exists:
        run('git clone %s %s' % (REPO, APP_DIR))
    else:
        with cd(APP_DIR):
            run('git pull')
