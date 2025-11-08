import { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import fs from "fs";
import path from "path";

// === Carrega config.json ===
const config = JSON.parse(fs.readFileSync("./config.json"));
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// === Login e status ===
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} iniciado com sucesso!`);
  client.user.setActivity(config.status, { type: 3 });
});

// === Sistema de boas-vindas ===
client.on("guildMemberAdd", async member => {
  if (!config.welcome.enabled || !config.welcome.channelId) return;
  const channel = member.guild.channels.cache.get(config.welcome.channelId);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setColor(config.welcome.embedColor)
    .setTitle("👋 Novo membro chegou!")
    .setDescription(`${config.welcome.message}\n> Usuário: ${member}`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
  channel.send({ embeds: [embed] });
});

// === Sistema de auto role ===
client.on("guildMemberAdd", async member => {
  if (config.autoRole.enabled && config.autoRole.roleId) {
    const role = member.guild.roles.cache.get(config.autoRole.roleId);
    if (role) member.roles.add(role).catch(() => {});
  }
});

// === Sistema de auto mod (filtro de palavrões) ===
client.on("messageCreate", async msg => {
  if (msg.author.bot || !config.autoMod.enabled) return;
  if (config.autoMod.badWords.some(w => msg.content.toLowerCase().includes(w))) {
    await msg.delete().catch(() => {});
    msg.channel.send(`🚫 ${msg.author}, sua mensagem foi removida (linguagem inadequada).`).then(m => setTimeout(() => m.delete(), 5000));
  }
});

// === Sistema de logs ===
async function sendLog(guild, description) {
  if (!config.logChannelId) return;
  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (!logChannel) return;
  const embed = new EmbedBuilder().setColor("#2F3136").setDescription(description).setTimestamp();
  logChannel.send({ embeds: [embed] });
}

// === Sistema de ticket ===
client.on("interactionCreate", async i => {
  if (!config.ticket.enabled) return;
  if (i.customId === "ticket_open") {
    const ticketChannel = await i.guild.channels.create({
      name: `ticket-${i.user.username}`,
      type: ChannelType.GuildText,
      parent: config.ticket.categoryId || null,
      permissionOverwrites: [
        { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.ticket.staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });
    const embed = new EmbedBuilder()
      .setColor(config.ticket.embedColor)
      .setTitle("🎫 Ticket Aberto")
      .setDescription("Descreva seu problema abaixo. Um staff responderá em breve.");
    const fecharBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_close").setLabel("Fechar").setStyle(ButtonStyle.Danger)
    );
    ticketChannel.send({ content: `<@&${config.ticket.staffRoleId}>`, embeds: [embed], components: [fecharBtn] });
    i.reply({ content: `✅ Ticket criado em ${ticketChannel}`, ephemeral: true });
    sendLog(i.guild, `🎟️ Ticket criado por ${i.user}`);
  }

  if (i.customId === "ticket_close") {
    await i.channel.delete().catch(() => {});
    sendLog(i.guild, `❌ Ticket fechado: ${i.channel.name}`);
  }
});

// === Sistema de mensagens de parceria ===
client.on("messageCreate", async msg => {
  if (msg.author.bot || !msg.content.startsWith(config.prefix)) return;
  const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === "parceira" && config.parceria.enabled) {
    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("🤝 Parceria")
      .setDescription(config.parceria.message)
      .setFooter({ text: "Astro Mídia" });
    msg.channel.send({ embeds: [embed] });
  }

  // === Comandos básicos de moderação ===
  if (cmd === "ban" && msg.member.permissions.has("BanMembers")) {
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Mencione alguém para banir.");
    await user.ban({ reason: "Banido pelo Astro Mídia" });
    msg.channel.send(`🚫 ${user.user.tag} foi banido.`);
    sendLog(msg.guild, `🚫 ${user.user.tag} foi banido por ${msg.author.tag}.`);
  }

  if (cmd === "unban" && msg.member.permissions.has("BanMembers")) {
    const userId = args[0];
    if (!userId) return msg.reply("Forneça o ID do usuário para desbanir.");
    await msg.guild.members.unban(userId).catch(() => msg.reply("Usuário não encontrado."));
    msg.channel.send(`✅ Usuário <@${userId}> foi desbanido.`);
    sendLog(msg.guild, `♻️ <@${userId}> foi desbanido por ${msg.author.tag}.`);
  }

  if (cmd === "kick" && msg.member.permissions.has("KickMembers")) {
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Mencione alguém para expulsar.");
    await user.kick("Expulso pelo Astro Mídia");
    msg.channel.send(`👢 ${user.user.tag} foi expulso.`);
    sendLog(msg.guild, `👢 ${user.user.tag} foi expulso por ${msg.author.tag}.`);
  }

  if (cmd === "mute") {
    msg.reply("🔇 Sistema de mute será configurável via `/config`.");
  }

  if (cmd === "lock") {
    msg.channel.permissionOverwrites.edit(msg.guild.id, { SendMessages: false });
    msg.reply("🔒 Canal trancado!");
  }

  if (cmd === "unlock") {
    msg.channel.permissionOverwrites.edit(msg.guild.id, { SendMessages: true });
    msg.reply("🔓 Canal destrancado!");
  }

  if (cmd === "clear") {
    const count = parseInt(args[0]) || 10;
    msg.channel.bulkDelete(count, true);
    msg.reply(`🧹 ${count} mensagens apagadas.`);
  }

  if (cmd === "fala") {
    const text = args.join(" ");
    if (!text) return msg.reply("Digite algo para eu falar!");
    msg.delete();
    msg.channel.send(text);
  }

  if (cmd === "info") {
    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🌌 Astro Mídia")
      .setDescription("Bot de moderação, tickets e integração Roblox — criado por <@1431337094302662761>.")
      .addFields(
        { name: "Prefixo", value: config.prefix, inline: true },
        { name: "Status", value: config.status, inline: true }
      );
    msg.channel.send({ embeds: [embed] });
  }

  if (cmd === "config") {
    msg.reply("⚙️ Use `/config` para alterar definições do bot!");
  }

  if (cmd === "inforoblox" && config.roblox.enabled) {
    msg.reply("🧑‍💻 Sistema de informações Roblox será adicionado com API oficial em breve!");
  }
});

client.login(config.token);
