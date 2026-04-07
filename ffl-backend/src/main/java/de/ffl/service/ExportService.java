package de.ffl.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import de.ffl.domain.*;
import de.ffl.dto.ExportDataDto;
import de.ffl.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ExportService {

    private static final Logger log = LoggerFactory.getLogger(ExportService.class);
    private static final String VERSION = "1.0.0";

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final SeasonRepository seasonRepository;
    private final PlayerRepository playerRepository;
    private final ManagerRepository managerRepository;
    private final RoundRepository roundRepository;
    private final GameRepository gameRepository;
    private final ManagerGroupRepository managerGroupRepository;

    public ExportService(UserRepository userRepository,
                         TeamRepository teamRepository,
                         SeasonRepository seasonRepository,
                         PlayerRepository playerRepository,
                         ManagerRepository managerRepository,
                         RoundRepository roundRepository,
                         GameRepository gameRepository,
                         ManagerGroupRepository managerGroupRepository) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.seasonRepository = seasonRepository;
        this.playerRepository = playerRepository;
        this.managerRepository = managerRepository;
        this.roundRepository = roundRepository;
        this.gameRepository = gameRepository;
        this.managerGroupRepository = managerGroupRepository;
    }

    public byte[] createExportZip() {
        try {
            ExportDataDto data = loadAllData();
            String json = toJson(data);
            return createZip(json);
        } catch (Exception e) {
            log.error("Export failed", e);
            throw new RuntimeException("Export failed: " + e.getMessage(), e);
        }
    }

    private ExportDataDto loadAllData() {
        log.info("Loading data for export...");

        ExportDataDto data = new ExportDataDto();
        data.setExportDate(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        data.setVersion(VERSION);

        data.setUsers(userRepository.findAll());
        log.info("Loaded {} users", data.getUsers().size());

        data.setTeams(teamRepository.findAll());
        log.info("Loaded {} teams", data.getTeams().size());

        List<Season> seasons = seasonRepository.findAll();
        data.setSeasons(seasons);
        log.info("Loaded {} seasons", data.getSeasons().size());

        data.setPlayers(playerRepository.findAll());
        log.info("Loaded {} players", data.getPlayers().size());

        List<Manager> managers = managerRepository.findAllWithPlayers();
        data.setManagers(managers);
        log.info("Loaded {} managers", data.getManagers().size());

        loadManagerPlayerRelations(managers, data);

        data.setRounds(roundRepository.findAll());
        log.info("Loaded {} rounds", data.getRounds().size());

        data.setGames(gameRepository.findAll());
        log.info("Loaded {} games", data.getGames().size());

        List<ManagerGroup> managerGroups = managerGroupRepository.findAll();
        data.setManagerGroups(managerGroups);
        log.info("Loaded {} manager groups", data.getManagerGroups().size());

        loadManagerGroupMemberRelations(managerGroups, data);

        loadSeasonTeamRelations(seasons, data);

        log.info("Data loading complete");
        return data;
    }

    private void loadManagerPlayerRelations(List<Manager> managers, ExportDataDto data) {
        for (Manager manager : managers) {
            Set<Player> players = manager.getPlayers();
            if (players != null) {
                for (Player player : players) {
                    ExportDataDto.ManagerPlayerRelation rel = new ExportDataDto.ManagerPlayerRelation();
                    rel.setManagerId(manager.getId());
                    rel.setPlayerId(player.getId());
                    data.getManagerPlayers().add(rel);
                }
            }
        }
        log.info("Loaded {} manager-player relations", data.getManagerPlayers().size());
    }

    private void loadManagerGroupMemberRelations(List<ManagerGroup> groups, ExportDataDto data) {
        for (ManagerGroup group : groups) {
            Set<Manager> members = group.getManagers();
            if (members != null) {
                for (Manager manager : members) {
                    ExportDataDto.ManagerGroupMemberRelation rel = new ExportDataDto.ManagerGroupMemberRelation();
                    rel.setManagerGroupId(group.getId());
                    rel.setManagerId(manager.getId());
                    data.getManagerGroupMembers().add(rel);
                }
            }
        }
        log.info("Loaded {} manager group member relations", data.getManagerGroupMembers().size());
    }

    private void loadSeasonTeamRelations(List<Season> seasons, ExportDataDto data) {
        for (Season season : seasons) {
            Set<Team> teams = season.getTeams();
            if (teams != null) {
                for (Team team : teams) {
                    ExportDataDto.SeasonTeamRelation rel = new ExportDataDto.SeasonTeamRelation();
                    rel.setSeasonId(season.getId());
                    rel.setTeamId(team.getId());
                    data.getSeasonTeams().add(rel);
                }
            }
        }
        log.info("Loaded {} season-team relations", data.getSeasonTeams().size());
    }

    private String toJson(ExportDataDto data) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        return mapper.writeValueAsString(data);
    }

    private byte[] createZip(String json) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            ZipEntry entry = new ZipEntry("data.json");
            zos.putNextEntry(entry);
            zos.write(json.getBytes("UTF-8"));
            zos.closeEntry();
        }
        return baos.toByteArray();
    }

    public String getExportFilename() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        return "ffl-export-" + timestamp + ".zip";
    }
}
