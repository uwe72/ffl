package de.ffl.dto;

public class InvitationPreviewDto {
    private String seasonName;
    private String startDateLong;
    private String deadlineDate;
    private String deadlineTime;
    private String startRoundRueckrunde;
    private String spieleinsatz;
    private String serverkosten;
    private String gewinnProzent;
    private String gewinnLetzter;
    private String anzahlSpielleiter;
    private String budget;
    private String webUrl;
    private String playersUrl;
    private String documentsUrl;

    public String getSeasonName() { return seasonName; }
    public void setSeasonName(String seasonName) { this.seasonName = seasonName; }

    public String getStartDateLong() { return startDateLong; }
    public void setStartDateLong(String startDateLong) { this.startDateLong = startDateLong; }

    public String getDeadlineDate() { return deadlineDate; }
    public void setDeadlineDate(String deadlineDate) { this.deadlineDate = deadlineDate; }

    public String getDeadlineTime() { return deadlineTime; }
    public void setDeadlineTime(String deadlineTime) { this.deadlineTime = deadlineTime; }

    public String getStartRoundRueckrunde() { return startRoundRueckrunde; }
    public void setStartRoundRueckrunde(String startRoundRueckrunde) { this.startRoundRueckrunde = startRoundRueckrunde; }

    public String getSpieleinsatz() { return spieleinsatz; }
    public void setSpieleinsatz(String spieleinsatz) { this.spieleinsatz = spieleinsatz; }

    public String getServerkosten() { return serverkosten; }
    public void setServerkosten(String serverkosten) { this.serverkosten = serverkosten; }

    public String getGewinnProzent() { return gewinnProzent; }
    public void setGewinnProzent(String gewinnProzent) { this.gewinnProzent = gewinnProzent; }

    public String getGewinnLetzter() { return gewinnLetzter; }
    public void setGewinnLetzter(String gewinnLetzter) { this.gewinnLetzter = gewinnLetzter; }

    public String getAnzahlSpielleiter() { return anzahlSpielleiter; }
    public void setAnzahlSpielleiter(String anzahlSpielleiter) { this.anzahlSpielleiter = anzahlSpielleiter; }

    public String getBudget() { return budget; }
    public void setBudget(String budget) { this.budget = budget; }

    public String getWebUrl() { return webUrl; }
    public void setWebUrl(String webUrl) { this.webUrl = webUrl; }

    public String getPlayersUrl() { return playersUrl; }
    public void setPlayersUrl(String playersUrl) { this.playersUrl = playersUrl; }

    public String getDocumentsUrl() { return documentsUrl; }
    public void setDocumentsUrl(String documentsUrl) { this.documentsUrl = documentsUrl; }
}
