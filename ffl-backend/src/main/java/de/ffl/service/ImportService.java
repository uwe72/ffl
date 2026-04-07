package de.ffl.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import de.ffl.domain.*;
import de.ffl.dto.ExportDataDto;
import de.ffl.dto.ImportResult;
import de.ffl.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class ImportService {

    private static final Logger log = LoggerFactory.getLogger(ImportService.class);

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final SeasonRepository seasonRepository;
    private final PlayerRepository playerRepository;
    private final ManagerRepository managerRepository;
    private final RoundRepository roundRepository;
    private final GameRepository gameRepository;
    private final ManagerGroupRepository managerGroupRepository;

    public ImportService(UserRepository userRepository,
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

    public ImportResult validateImport(byte[] zipData) {
        return doImport(zipData, true);
    }

    @Transactional
    public ImportResult importData(byte[] zipData) {
        return doImport(zipData, false);
    }

    private ImportResult doImport(byte[] zipData, boolean dryRun) {
        ImportResult result = new ImportResult();
        result.setDryRun(dryRun);

        try {
            ExportDataDto data = parseZip(zipData);
            if (data == null) {
                result.setSuccess(false);
                result.setMessage("Invalid export file");
                return result;
            }

            validateData(data, result);
            if (!result.getErrors().isEmpty()) {
                result.setSuccess(false);
                result.setMessage("Validation failed");
                return result;
            }

            if (dryRun) {
                result.setSuccess(true);
                result.setMessage("Validation successful - ready to import");
                setCounts(result, data);
                return result;
            }

            clearAllTables();
            importAllData(data, result);
            resetSequences();

            result.setSuccess(true);
            result.setMessage("Import successful");
            return result;

        } catch (Exception e) {
            log.error("Import failed", e);
            result.setSuccess(false);
            result.setMessage("Import failed: " + e.getMessage());
            result.getErrors().add(e.getMessage());
            return result;
        }
    }

    private ExportDataDto parseZip(byte[] zipData) throws Exception {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(zipData))) {
            ZipEntry entry = zis.getNextEntry();
            if (entry == null || !entry.getName().equals("data.json")) {
                return null;
            }

            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            return mapper.readValue(zis, ExportDataDto.class);
        }
    }

    private void validateData(ExportDataDto data, ImportResult result) {
        if (data.getVersion() == null) {
            result.getErrors().add("Missing version");
        }
        if (data.getUsers() == null || data.getUsers().isEmpty()) {
            result.getErrors().add("No users to import");
        }
    }

    private void setCounts(ImportResult result, ExportDataDto data) {
        result.setUsersImported(data.getUsers().size());
        result.setTeamsImported(data.getTeams().size());
        result.setSeasonsImported(data.getSeasons().size());
        result.setPlayersImported(data.getPlayers().size());
        result.setManagersImported(data.getManagers().size());
        result.setRoundsImported(data.getRounds().size());
        result.setGamesImported(data.getGames().size());
        result.setManagerGroupsImported(data.getManagerGroups().size());
        result.setManagerPlayersImported(data.getManagerPlayers().size());
        result.setManagerGroupMembersImported(data.getManagerGroupMembers().size());
        result.setSeasonTeamsImported(data.getSeasonTeams().size());
    }

    private void clearAllTables() {
        log.info("Clearing all tables...");

        clearRelationTables();

        managerGroupRepository.deleteAll();
        log.info("Cleared manager_groups");

        gameRepository.deleteAll();
        log.info("Cleared games");

        roundRepository.deleteAll();
        log.info("Cleared rounds");

        managerRepository.deleteAll();
        log.info("Cleared managers");

        playerRepository.deleteAll();
        log.info("Cleared players");

        seasonRepository.deleteAll();
        log.info("Cleared seasons");

        teamRepository.deleteAll();
        log.info("Cleared teams");

        userRepository.deleteAll();
        log.info("Cleared users");

        log.info("All tables cleared");
    }

    private void clearRelationTables() {
        managerRepository.deleteAllPlayerRelations();
        managerGroupRepository.deleteAllManagerRelations();
        seasonRepository.deleteAllTeamRelations();
        log.info("Cleared relation tables");
    }

    private void importAllData(ExportDataDto data, ImportResult result) {
        log.info("Importing data...");

        importUsers(data, result);
        importTeams(data, result);
        importSeasons(data, result);
        importPlayers(data, result);
        importManagers(data, result);
        importRounds(data, result);
        importGames(data, result);
        importManagerGroups(data, result);
        importManagerPlayerRelations(data, result);
        importManagerGroupMemberRelations(data, result);
        importSeasonTeamRelations(data, result);

        log.info("Data import complete");
    }

    private void importUsers(ExportDataDto data, ImportResult result) {
        List<User> saved = userRepository.saveAll(data.getUsers());
        result.setUsersImported(saved.size());
        log.info("Imported {} users", saved.size());
    }

    private void importTeams(ExportDataDto data, ImportResult result) {
        List<Team> saved = teamRepository.saveAll(data.getTeams());
        result.setTeamsImported(saved.size());
        log.info("Imported {} teams", saved.size());
    }

    private void importSeasons(ExportDataDto data, ImportResult result) {
        List<Season> seasons = data.getSeasons();
        for (Season season : seasons) {
            season.setTeams(new HashSet<>());
            season.setManagers(new HashSet<>());
            season.setPlayers(new HashSet<>());
            season.setRounds(new HashSet<>());
        }
        List<Season> saved = seasonRepository.saveAll(seasons);
        result.setSeasonsImported(saved.size());
        log.info("Imported {} seasons", saved.size());
    }

    private void importPlayers(ExportDataDto data, ImportResult result) {
        List<Player> saved = playerRepository.saveAll(data.getPlayers());
        result.setPlayersImported(saved.size());
        log.info("Imported {} players", saved.size());
    }

    private void importManagers(ExportDataDto data, ImportResult result) {
        List<Manager> managers = data.getManagers();
        for (Manager manager : managers) {
            manager.setPlayers(new HashSet<>());
            manager.setManagerGroups(new HashSet<>());
        }
        List<Manager> saved = managerRepository.saveAll(managers);
        result.setManagersImported(saved.size());
        log.info("Imported {} managers", saved.size());
    }

    private void importRounds(ExportDataDto data, ImportResult result) {
        List<Round> saved = roundRepository.saveAll(data.getRounds());
        result.setRoundsImported(saved.size());
        log.info("Imported {} rounds", saved.size());
    }

    private void importGames(ExportDataDto data, ImportResult result) {
        List<Game> saved = gameRepository.saveAll(data.getGames());
        result.setGamesImported(saved.size());
        log.info("Imported {} games", saved.size());
    }

    private void importManagerGroups(ExportDataDto data, ImportResult result) {
        List<ManagerGroup> groups = data.getManagerGroups();
        for (ManagerGroup group : groups) {
            group.setManagers(new HashSet<>());
        }
        List<ManagerGroup> saved = managerGroupRepository.saveAll(groups);
        result.setManagerGroupsImported(saved.size());
        log.info("Imported {} manager groups", saved.size());
    }

    private void importManagerPlayerRelations(ExportDataDto data, ImportResult result) {
        for (ExportDataDto.ManagerPlayerRelation rel : data.getManagerPlayers()) {
            managerRepository.addPlayerRelation(rel.getManagerId(), rel.getPlayerId());
        }
        result.setManagerPlayersImported(data.getManagerPlayers().size());
        log.info("Imported {} manager-player relations", data.getManagerPlayers().size());
    }

    private void importManagerGroupMemberRelations(ExportDataDto data, ImportResult result) {
        for (ExportDataDto.ManagerGroupMemberRelation rel : data.getManagerGroupMembers()) {
            managerGroupRepository.addManagerRelation(rel.getManagerGroupId(), rel.getManagerId());
        }
        result.setManagerGroupMembersImported(data.getManagerGroupMembers().size());
        log.info("Imported {} manager group member relations", data.getManagerGroupMembers().size());
    }

    private void importSeasonTeamRelations(ExportDataDto data, ImportResult result) {
        for (ExportDataDto.SeasonTeamRelation rel : data.getSeasonTeams()) {
            seasonRepository.addTeamRelation(rel.getSeasonId(), rel.getTeamId());
        }
        result.setSeasonTeamsImported(data.getSeasonTeams().size());
        log.info("Imported {} season-team relations", data.getSeasonTeams().size());
    }

    private void resetSequences() {
        log.info("Resetting sequences...");
        userRepository.resetSequence();
        teamRepository.resetSequence();
        seasonRepository.resetSequence();
        playerRepository.resetSequence();
        managerRepository.resetSequence();
        roundRepository.resetSequence();
        gameRepository.resetSequence();
        managerGroupRepository.resetSequence();
        log.info("Sequences reset");
    }
}
