require("isomorphic-fetch");
const Byte = require('byte-app').default
const client = new Byte(process.env.TOKEN);
const Logger = require('./util/logger')
const exceptions = require('./exceptions')

// CHANGE VALUES BELOW HERE
let actualBio = "Software Engineer | Snipey.dev";
let followLimit = 100;


// CHANGE NOTHING BELOW HERE
var APP_STATE = 1;

/*
1 STARTING
2 STARTED
3 START_FOLLOWING
4 START_UNFOLLOWING
5 FOLLOWING
6 UNFOLLOWING
7 STOP_FOLLOWING
8 STOP_UNFOLLOWING
0 PAUSED
*/

// TODO Store to database
// TODO Check database if followers have followed back
const Cursors = new Map();
const Users = new Map();


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const main = async () => {
	Logger.info("Byte Bot Starting...")
	setInterval(getStats, 60000);
	setInterval(getSessionStats, 60000);
	setInterval(updateBioStats, 120000);
	await getStats();
	this.APP_STATE = 2
	Logger.info("Byte Bot Started!")
	determineState();
}

const determineState = async () => {
	const profile = await client.me()
	if (Users.size >= followLimit) {
		this.APP_STATE = 4
	} else {
		this.APP_STATE = 3
	}
	while(APP_STATE != 0) {
		try{
			await getSessionStats()
			switch(this.APP_STATE) {
				case 3:
					await getPopular() // TODO REFACTOR TO START FOLLOWING
					this.APP_STATE = 5
					Logger.error("----------------------------")
					Logger.info("Set the mode to FOLLOWING")
					Logger.error("----------------------------")
					break;
				case 4:
					await startUnFollowing()
					this.APP_STATE = 6
					Logger.error("----------------------------")
					Logger.info("Set the mode to UNFOLLOWING")
					Logger.error("----------------------------")
					break;
				default:
					this.APP_STATE = 0
			}
		} catch (e) {
			Logger.error("Failed to determine state: \n"+e)
		}
	}
}

const updateBioStats = async () => {
	const profile = await client.me()
	await client.settings({ bio: `${profile.data.followerCount.toLocaleString("en-US")} followers      \n\n${actualBio}` });
	try {
		Logger.info("---------------------------------")
		Logger.info("Updated Profile!")
		Logger.info("---------------------------------")
	} catch (e) {
		Logger.error(e)
	}
}

const getSessionStats = async () => {
	try {
		Logger.info("---------------------------------")
		Logger.info("Current Session stats: ")
		Logger.info(`Current app state: ${this.APP_STATE}`)
		Logger.info(`Following ${Users.size.toLocaleString("en-US")} more people`)
		Logger.info("---------------------------------")
	} catch (e) {
		Logger.error(e)
	}
}

const getStats = async () => {
	try {
		const profile = await client.me()
		Logger.info("---------------------------------")
		Logger.info("Current user stats: ")
		Logger.info(`${profile.data.followerCount.toLocaleString("en-US")} followers`)
		Logger.info(`${profile.data.followingCount.toLocaleString("en-US")} following`)
		Logger.info("---------------------------------")
	} catch (e) {
		Logger.error(e)
	}
}

const startFollowing = async (post) => {
	// TODO Store users to DB with following=true
	// TODO Rewrite following to have follow modes
	// TODO Refactor this
	let likes = await client.likes(post.id)
	const profile = await client.me()
	// Loop through likes
	for await (let user of likes.data.accounts) {
		// Follow user from likes
		try {
			// Ignore dupe user
			if (Users.get(user.id)) {
				continue;
			}
			Users.set(user.id, user);

			// Follow user
			client.follow(user.id)
			Logger.log(`Followed user: ${user.username} id: ${user.id}`);
			await sleep(450);
			if(Users.size >= followLimit) {
				this.APP_STATE === 4
				Logger.info("Changing mode to UNFOLLOW")
				break
			}
			await getSessionStats()
		} catch (e) {
			Logger.Error("Failed to follow user "+user.id)
			await sleep(450);
		}
	}
}

const startUnFollowing = async (cursor) => {
	try{
		let following = await getFollowing(cursor);

		for await (let user of following.data.accounts) {
			if(user.username === exceptions.includes(user.username)){
				Logger.info(`Skipped ${user.username} id: ${user.id}`)
				continue
			}
			await unfollowUser(user)
		}
		await sleep(1000);
		await startUnFollowing(following.data.cursor)
	} catch (e) {
		Logger.error("Failed to start following: \n"+e)
	}

}

const getFollowing = async (cursor) => {
	try{
		const following = await client.following(cursor)
		return following
	} catch (e) {
		Logger.error("Failed to get following: \n"+e)
	}
}

const unfollowUser = async (user) => {
	try {
		await client.unfollow(user.id)
		Logger.log(`Unfollowed user: ${user.username} id: ${user.id}`)
	}catch (e) {
		Logger.error(`Failed to unfollow user: ${user.username} id: ${user.id}`)
	}
	
}

const getPopular = async (cursor) => {
	if (cursor) {
	    Logger.log(`Calling next cursor: ${cursor}`);
	    Cursors.set(cursor, cursor);
	}

	try {
		// Get popular posts
		let popular = await client.explore.popular()
		// if there is a cursor defined
		if (cursor) {
			Logger.log(`Calling next cursor: ${cursor}`);
			popular = await client.explore.popular(cursor)
			Cursors.set(cursor, cursor);
		}
		// Loop through posts
		for await (let post of popular.data.posts) {
			await startFollowing(post)
			await sleep(450);
			if(this.APP_STATE === 4) break
		}
	} catch (e) {
		Logger.error("Failed to get popular posts: \n"+e);
	}
}

const loopByte = async (post) => {
	// Loop post twice
	for (let i = 0; i < 2; i++) {
		try {
			await client.loop(post.id);
			Logger.log(`Looped over ${post.id} #`, i+1);
		} catch (e) {
			Logger.log(`Failed to loop over ${post.id}: `+e);
		}
	}
}

main();