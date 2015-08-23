var plan = require('flightplan');

plan.target("staging", {
	webRoot: '/cloud/mangaloop/staging',
	host: 'staging.mangaloop.com',
	username: 'manga',
	agent: process.env.SSH_AUTH_SOCK
});


plan.target("prod", {
	webRoot: '/cloud/mangaloop/prod',
	host: 'api.mangaloop.com',
	username: 'manga',
	agent: process.env.SSH_AUTH_SOCK,
	port: 4444,
});


plan.target('dev', {
	webRoot: '/cloud/mangaloop/dev',
	host: 'mangaloop.com',
	username: 'manga',
	// privateKey: '/Users/cameron/.ssh/id_rsa',
	port: 4444,
	agent: process.env.SSH_AUTH_SOCK

});


plan.remote('setup', function(transport){
	// transport.hostname();
	// console.log(transport.runtime);
	// transport.sudo('apt-get update');
	// transport.sudo('apt-get install -y nginx');
	// transport.sudo('apt-get install -y git');
	// transport.sudo('apt-get install -y build-essential libssl-dev');
	// transport.exec('curl https://raw.githubusercontent.com/creationix/nvm/v0.24.0/install.sh | sh');
	// transport.exec('source ~/.profile');
	// transport.exec('nvm install v0.11.16')
	// transport.exec('nvm alias default v0.11.16');
	// transport.exec('nvm use default');

	transport.sudo('npm install pm2 -g', {user: 'manga'});

});


