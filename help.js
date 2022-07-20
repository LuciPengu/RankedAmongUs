module.exports = {
  'help': {
    description: 'Shows the list of commands or help on specified command.',
    format: 'help [command-name]'
  },
  'rules': {
    description: 'Shows the important rules and the match settings that should be followed in a ranked game.',
    format: 'rules'
  },
  'mods': {
    aliases: ['moderators'],
    description: 'Shows a list of the ranked moderators.',
    format: 'mods'
  },
  'current': {
    description: "Shows the current game you're in.",
    format: 'current'
  },
  'leaders': {
    description: 'Shows the ranked among us leaderboard.',
    format: 'leaders'
  },
  'mr': {
    aliases: ['myresults'],
    description: 'Shows your ranked stats or the stats of another user.',
    format: 'mr [player-name]'
  },
  'start': {
    description: "Starts a game if you're in a ranked VC with 10 people",
    format: 'start [map-name]'
  },
  'impostor': {
    description: "Ends a game if you specify which players were the impostor and if the impostors won or not",
    format: 'impostor [impostor#] [impostor#] [win-lose]'
  }

}