// === Astro Mídia - Criadora: <@1431337094302662761> ===
// Bot completo, modo híbrido (Render + Local), com prefixo e slash commands

const fs = require("fs");
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, PermissionsBitField } = require("discord.js");
const { REST, Routes } = require("discord.js");
const path = require("path");

// --- CONFIG GLOBAL ---
const PREFIX = process.env.PREFIX || "!";
const TOKEN = process.env.TOKEN;

// Detecta ambiente
const isRender = process.env.RENDER || process.env.RENDER_SERVICE_NAME;

// Carrega config se local
let config = {
    systems: {
        welcome: true,
        ticket: true,
        automod: true,
        autorole: true,
        parceria: true,
        status: true,
    },
    embeds: {
        welcome: { title: "👋 Bem-vindo(a)!", description: "Seja bem-vindo(a) ao servidor!", color: "#5865F2" },
        ticket: { title: "🎟️ Sistema de Tickets", description: "Abra um ticket abaixo:", color: "#57F287" }
    },
    channels: {},
    roles: {}
};

if (!isRender) {
    const configPath = path.join(__dirname, "config.json");
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    }
}

// --- CLIENT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

// --- REGISTRO DE COMANDOS SLASH ---
const slashCommands = [
    {
        name: "config",
        description: "Configura o Astro Mídia no servidor.",
    },
    {
        name: "info",
        description: "Mostra informações do bot e do criador do servidor."
    },
    {
        name: "inforoblox",
        description: "Mostra informações de um usuário do Roblox.",
        options: [
            { name: "usuario", type: 3, description: "Nome do usuário do Roblox", required: true }
        ]
    }
];

// --- EVENT READY ---
client.once("ready", async () => {
    console.log(`✅ ${client.user.tag} está online!`);
    client.user.setActivity("astro mídia", { type: 0 }); // Jogando astro mídia

    // Registra slash commands
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log("✨ Comandos slash registrados com sucesso!");
    } catch (err) {
        console.error("Erro ao registrar slash:", err);
    }
});

// --- SISTEMA DE BOAS-VINDAS ---
client.on("guildMemberAdd", member => {
    if (!config.systems.welcome) return;
    const canal = member.guild.systemChannel;
    if (canal) {
        const embed = new EmbedBuilder()
            .setTitle(config.embeds.welcome.title)
            .setDescription(`${config.embeds.welcome.description}\n👤 ${member}`)
            .setColor(config.embeds.welcome.color);
        canal.send({ embeds: [embed] });
    }
});

// --- COMANDOS DE TEXTO (PREFIXO) ---
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // --- BAN ---
    if (cmd === "ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("❌ Você não tem permissão para banir!");
        const user = message.mentions.members.first();
        if (!user) return message.reply("❌ Mencione um usuário!");
        await user.ban({ reason: "Banido pelo Astro Mídia" });
        message.reply(`🔨 ${user.user.tag} foi banido.`);
    }

    // --- UNBAN ---
    else if (cmd === "unban") {
        const id = args[0];
        if (!id) return message.reply("❌ Forneça o ID do usuário.");
        await message.guild.members.unban(id);
        message.reply(`✅ Usuário com ID ${id} foi desbanido.`);
    }

    // --- CLEAR ---
    else if (cmd === "clear") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return message.reply("❌ Sem permissão!");
        const amount = parseInt(args[0]);
        if (!amount) return message.reply("❌ Diga quantas mensagens apagar!");
        await message.channel.bulkDelete(amount);
        message.channel.send(`🧹 ${amount} mensagens apagadas.`);
    }

    // --- CONFIG (prefixo) ---
    else if (cmd === "config") {
        message.reply("⚙️ Use o comando `/config` para configurar o bot!");
    }

    // --- INFO ---
    else if (cmd === "info") {
        const owner = await message.guild.fetchOwner();
        const embed = new EmbedBuilder()
            .setTitle("🤖 Astro Mídia - Informações")
            .setDescription(`Criadora do bot: <@1431337094302662761>\nCriador do servidor: ${owner.user}`)
            .setColor("#5865F2");
        message.reply({ embeds: [embed] });
    }
});

// --- INTERAÇÃO DE SLASH ---
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "config") {
        const embed = new EmbedBuilder()
            .setTitle("⚙️ Painel de Configuração")
            .setDescription("Use os botões abaixo para ativar/desativar sistemas.")
            .setColor("#5865F2");
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === "info") {
        const owner = await interaction.guild.fetchOwner();
        const embed = new EmbedBuilder()
            .setTitle("🤖 Astro Mídia - Informações")
            .setDescription(`Criadora: <@1431337094302662761>\nCriador do servidor: ${owner.user}`)
            .setColor("#57F287");
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === "inforoblox") {
        const user = interaction.options.getString("usuario");
        await interaction.reply(`🔍 Buscando informações de **${user}** no Roblox...`);
        // Aqui entraria a API do Roblox futuramente
    }
});

client.login(TOKEN);
