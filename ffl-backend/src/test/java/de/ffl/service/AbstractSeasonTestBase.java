package de.ffl.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.ffl.domain.*;
import de.ffl.repository.*;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public abstract class AbstractSeasonTestBase {

    protected static final int TRANSFER_ROUND = 16;

    @Autowired
    protected SeasonCalculationService seasonCalculationService;
    @Autowired
    protected SeasonRepository seasonRepository;
    @Autowired
    protected TeamRepository teamRepository;
    @Autowired
    protected PlayerRepository playerRepository;
    @Autowired
    protected RoundRepository roundRepository;
    @Autowired
    protected GameRepository gameRepository;
    @Autowired
    protected ManagerRepository managerRepository;
    @Autowired
    protected ManagerRankRepository managerRankRepository;
    @Autowired
    protected PlayerRankRepository playerRankRepository;
    @Autowired
    protected PointsRepository pointsRepository;
    @Autowired
    protected UserRepository userRepository;
    @Autowired
    protected EntityManager entityManager;

    protected Season season;
    protected Manager managerUwe72;
    protected Map<Long, Player> playerMap = new HashMap<>();
    protected Map<Long, Team> teamMap = new HashMap<>();
    protected Map<Integer, Round> roundMap = new HashMap<>();

    protected void loadTestData() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        InputStream is = getClass().getClassLoader().getResourceAsStream("testdata/season_2025_26.json");
        JsonNode root = mapper.readTree(is);

        season = Season.builder()
                .name("2025/26")
                .budget(30000000)
                .seasonState(SeasonState.RUNNING_RUECKRUNDE)
                .startRoundRueckrunde(TRANSFER_ROUND)
                .build();
        season = seasonRepository.save(season);

        Map<Long, Long> oldToNewTeamId = new HashMap<>();
        for (JsonNode teamNode : root.get("teams")) {
            Team team = Team.builder()
                    .name(teamNode.get("name").asText())
                    .shortName(teamNode.has("shortName") && !teamNode.get("shortName").isNull() ? teamNode.get("shortName").asText() : null)
                    .build();
            team = teamRepository.save(team);
            oldToNewTeamId.put(teamNode.get("id").asLong(), team.getId());
            teamMap.put(team.getId(), team);
        }

        season.setTeams(new HashSet<>(teamMap.values()));
        season = seasonRepository.save(season);

        Map<Long, Long> oldToNewPlayerId = new HashMap<>();
        for (JsonNode playerNode : root.get("players")) {
            long oldId = playerNode.get("id").asLong();
            Player player = Player.builder()
                    .nameKicker(playerNode.get("nameKicker").asText())
                    .nameKickerAlt1(nullableText(playerNode, "nameKickerAlt1"))
                    .nameKickerAlt2(nullableText(playerNode, "nameKickerAlt2"))
                    .nameKickerAlt3(nullableText(playerNode, "nameKickerAlt3"))
                    .firstName(nullableText(playerNode, "firstName"))
                    .lastName(nullableText(playerNode, "lastName"))
                    .position(Position.valueOf(playerNode.get("position").asText()))
                    .prize(playerNode.get("prize").asInt())
                    .season(season)
                    .teams(new ArrayList<>())
                    .build();

            String teamIds = nullableText(playerNode, "teamIds");
            if (teamIds != null) {
                for (String tid : teamIds.split(",")) {
                    Long newTeamId = oldToNewTeamId.get(Long.parseLong(tid.trim()));
                    if (newTeamId != null && teamMap.containsKey(newTeamId)) {
                        player.getTeams().add(teamMap.get(newTeamId));
                    }
                }
            }

            player = playerRepository.save(player);
            oldToNewPlayerId.put(oldId, player.getId());
            playerMap.put(player.getId(), player);
        }

        for (int i = 1; i <= 34; i++) {
            Round round = Round.builder()
                    .number(i)
                    .season(season)
                    .build();
            round = roundRepository.save(round);
            roundMap.put(i, round);
        }

        for (JsonNode gameNode : root.get("games")) {
            int roundNumber = gameNode.get("roundNumber").asInt();
            Round round = roundMap.get(roundNumber);
            Long newHostId = oldToNewTeamId.get(gameNode.get("hostId").asLong());
            Long newVisitorId = oldToNewTeamId.get(gameNode.get("visitorId").asLong());

            String formation = nullableText(gameNode, "formation");
            Game game = Game.builder()
                    .name(gameNode.get("name").asText())
                    .round(round)
                    .host(teamMap.get(newHostId))
                    .visitor(teamMap.get(newVisitorId))
                    .formation(formation)
                    .formationExtern(formation)
                    .build();
            gameRepository.save(game);
        }

        for (JsonNode managerNode : root.get("managers")) {
            User user = User.builder()
                    .login(managerNode.get("login").asText())
                    .password("$2a$10$test")
                    .email("test@test.de")
                    .firstName(nullableText(managerNode, "firstName"))
                    .lastName(nullableText(managerNode, "lastName"))
                    .role(UserRole.NORMAL)
                    .build();
            user = userRepository.save(user);

            Manager manager = Manager.builder()
                    .user(user)
                    .season(season)
                    .budget(managerNode.get("budget").asInt())
                    .build();

            manager.setPlayerGoalkeeper(resolvePlayer(oldToNewPlayerId, managerNode, "playerGoalkeeperID"));
            manager.setPlayerDefender1(resolvePlayer(oldToNewPlayerId, managerNode, "playerDefender1ID"));
            manager.setPlayerDefender2(resolvePlayer(oldToNewPlayerId, managerNode, "playerDefender2ID"));
            manager.setPlayerDefender3(resolvePlayer(oldToNewPlayerId, managerNode, "playerDefender3ID"));
            manager.setPlayerMidfield1(resolvePlayer(oldToNewPlayerId, managerNode, "playerMidfield1ID"));
            manager.setPlayerMidfield2(resolvePlayer(oldToNewPlayerId, managerNode, "playerMidfield2ID"));
            manager.setPlayerMidfield3(resolvePlayer(oldToNewPlayerId, managerNode, "playerMidfield3ID"));
            manager.setPlayerStriker1(resolvePlayer(oldToNewPlayerId, managerNode, "playerStriker1ID"));
            manager.setPlayerStriker2(resolvePlayer(oldToNewPlayerId, managerNode, "playerStriker2ID"));
            manager.setPlayerStriker3(resolvePlayer(oldToNewPlayerId, managerNode, "playerStriker3ID"));
            manager.setPlayerFreeChoice(resolvePlayer(oldToNewPlayerId, managerNode, "playerFreeChoiceID"));
            manager.setPlayerExchangedOld1(resolvePlayer(oldToNewPlayerId, managerNode, "playerExchangedOld1ID"));
            manager.setPlayerExchangedNew1(resolvePlayer(oldToNewPlayerId, managerNode, "playerExchangedNew1ID"));
            manager.setPlayerExchangedOld2(resolvePlayer(oldToNewPlayerId, managerNode, "playerExchangedOld2ID"));
            manager.setPlayerExchangedNew2(resolvePlayer(oldToNewPlayerId, managerNode, "playerExchangedNew2ID"));
            manager.setPlayerExchangedOld3(resolvePlayer(oldToNewPlayerId, managerNode, "playerExchangedOld3ID"));
            manager.setPlayerExchangedNew3(resolvePlayer(oldToNewPlayerId, managerNode, "playerExchangedNew3ID"));

            manager = managerRepository.save(manager);
            if ("uwe72".equals(managerNode.get("login").asText())) {
                managerUwe72 = manager;
            }
        }

        entityManager.flush();
        entityManager.clear();

        managerUwe72 = managerRepository.findById(managerUwe72.getId()).orElseThrow();
        season = seasonRepository.findById(season.getId()).orElseThrow();

        playerMap.clear();
        for (Player p : playerRepository.findBySeasonId(season.getId())) {
            playerMap.put(p.getId(), p);
        }
    }

    private Player resolvePlayer(Map<Long, Long> oldToNewPlayerId, JsonNode node, String field) {
        if (!node.has(field) || node.get(field).isNull()) return null;
        Long oldId = node.get(field).asLong();
        Long newId = oldToNewPlayerId.get(oldId);
        if (newId == null) return null;
        return playerMap.get(newId);
    }

    private String nullableText(JsonNode node, String field) {
        if (!node.has(field) || node.get(field).isNull()) return null;
        return node.get(field).asText();
    }
}
