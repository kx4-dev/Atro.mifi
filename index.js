// ================================
// Bot Astro Mídia - Comunidade RP
// Criadora: <@1431337094302662761>
// ================================

const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ================================
// Configuração inicial
// ================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

const prefix = process.env.PREFIX || "!";
client.commands = new Collection();

// ================================
// Modo híbrido (Render / Local)
// ================================
const isRender = process.env.RENDER || process.env.RENDER_SERVICE_NAME;

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
        welcome: { title: "👋 Bem-vindo(a)!", description: "Seja bem-vindo(a) ao servidor Astro Mídia!", color: "#5865F2" },
        ticket: { title: "🎟️ Sistema de Tickets", description: "Abra um ticket abaixo:", color: "#57F287" }
    }
};

if (!isRender) {
    const configPath = path.join(__dirname, "config.json");
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    }
}

// ================================
// Slash Commands
// ================================
const slashCommands = [
    { name: "lock", description: "Tranca o canal." },
    { name: "unlock", description: "Destranca o canal." },
    { name: "avisos", description: "Mostra os avisos do servidor." },
    { name: "clear", description: "Limpa mensagens do canal." },
    { name: "fala", description: "Faz o bot falar algo." },
    { name: "ban", description: "Bane um usuário do servidor.", options: [{ name: "usuario", type: 6, description: "Escolha o usuário", required: true }] },
    { name: "unban", description: "Desbane um usuário.", options: [{ name: "id", type: 3, description: "ID do usuário", required: true }] },
    { name: "kick", description: "Expulsa um usuário.", options: [{ name: "usuario", type: 6, description: "Escolha o usuário", required: true }] },
    { name: "mute", description: "Silencia um usuário.", options: [{ name: "usuario", type: 6, description: "Escolha o usuário", required: true }] },
    { name: "addrole", description: "Adiciona um cargo a um usuário.", options: [{ name: "usuario", type: 6, description: "Escolha o usuário", required: true }, { name: "cargo", type: 8, description: "Escolha o cargo", required: true }] },
    { name: "roleall", description: "Adiciona cargo a todos os membros.", options: [{ name: "cargo", type: 8, description: "Escolha o cargo", required: true }] },
    { name: "parceira", description: "Cria uma parceria com outro servidor." },
    { name: "config", description: "Configura sistemas do bot." },
    { name: "info", description: "Mostra informações do bot e do servidor." },
    { name: "inforoblox", description: "Mostra informações do Roblox.", options: [{ name: "usuario", type: 3, description: "Nome do usuário Roblox", required: true }] },
];

// ================================
// Ready
// ================================
client.once("ready", async () => {
    console.log(`✅ ${client.user.tag} está online!`);
    client.user.setActivity("🌌 Astro Mídia RP — Online 24h", { type: 0 });

    const { REST, Routes } = require("discord.js");
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log("✨ Comandos slash registrados com sucesso!");
    } catch (err) { console.error(err); }
});

// ================================
// Boas-vindas com botões
// ================================
client.on("guildMemberAdd", member => {
    if (!config.systems.welcome) return;

    const canal = member.guild.systemChannel;
    if (!canal) return;

    const embed = new EmbedBuilder()
        .setTitle(config.embeds.welcome.title)
        .setDescription(`${config.embeds.welcome.description}\n👤 ${member}`)
        .setColor(config.embeds.welcome.color)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Astro Mídia | Comunidade RP", iconURL: client.user.displayAvatarURL() });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setLabel("🎟️ Abrir Ticket").setStyle(ButtonStyle.Primary).setCustomId("abrir_ticket"),
            new ButtonBuilder().setLabel("📜 Regras").setStyle(ButtonStyle.Secondary).setCustomId("ver_regras")
        );

    canal.send({ embeds: [embed], components: [row] });
});

// ================================
// Interação com botões
// ================================
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === "abrir_ticket") {
            await interaction.reply({ content: "🎫 Ticket aberto! Um membro da staff entrará em contato.", ephemeral: true });
        }
        if (interaction.customId === "ver_regras") {
            await interaction.reply({ content: "📜 Respeite todos os membros e siga o RP corretamente!", ephemeral: true });
        }
    }
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        // Exemplo de comando: ban
        if (commandName === "ban") {
            const usuario = options.getUser("usuario");
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });
            }
            await interaction.guild.members.ban(usuario.id, { reason: "Banido pelo Astro Mídia" });
            return interaction.reply({ content: `🔨 ${usuario.tag} foi banido.` });
        }

        if (commandName === "unban") {
            const id = options.getString("id");
            await interaction.guild.members.unban(id);
            return interaction.reply({ content: `✅ Usuário com ID ${id} desbanido.` });
        }

        if (commandName === "info") {
            const dono = await interaction.guild.fetchOwner();
            const embed = new EmbedBuilder()
                .setTitle("🤖 Astro Mídia - Informações")
                .setDescription(`Criadora do bot: <@1431337094302662761>\nCriador do servidor: ${dono.user.tag}`)
                .setColor("#57F287");
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (commandName === "inforoblox") {
            const usuario = options.getString("usuario");
            return interaction.reply({ content: `🔍 Buscando informações do Roblox para **${usuario}**...` });
        }

        // Aqui você pode adicionar os outros comandos: /kick, /mute, /addrole, /roleall, /parceira, /clear, /lock, /unlock, /avisos, /fala, /config
    }
});

// ================================
// Mensagens com prefixo (!)
// ================================
client.on("messageCreate", message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "ping") {
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle("🏓 Pong!")
            .setDescription(`Latência: **${client.ws.ping}ms**`)
            .setColor("#5865F2")
        ]});
    }

    if (cmd === "info") {
        return message.reply({ embeds: [new EmbedBuilder()
            .setTitle("🤖 Astro Mídia - Info")
            .setDescription(`Criadora do bot: <@1431337094302662761>`)
            .setColor("#57F287")
        ]});
    }
});

// ================================
// Login
// ================================
client.login(process.env.TOKEN);