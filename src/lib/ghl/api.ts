import axios, { type AxiosInstance, type AxiosError } from "axios";
import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type {
  GHLContact,
  GHLContactsResponse,
  GHLConversation,
  GHLConversationsResponse,
  GHLMessage,
  GHLMessagesResponse,
  GHLPipeline,
  GHLPipelinesResponse,
  GHLOpportunity,
  GHLOpportunitiesResponse,
  GHLNote,
  GHLNotesResponse,
  GHLCustomField,
  GHLCustomFieldsResponse,
  GHLLocation,
  GHLLocationResponse,
  GHLCalendar,
  GHLCalendarsResponse,
  GHLAppointment,
  GHLAppointmentsResponse,
  GHLForm,
  GHLFormsResponse,
  GHLFormSubmission,
  GHLFormSubmissionsResponse,
  GHLTag,
  GHLTagsResponse,
  CreateContactData,
  UpdateContactData,
  CreateOpportunityData,
  UpdateOpportunityData,
  SendMessageData,
} from "./types";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";
const MAX_RETRIES = 3;

interface GHLClientConfig {
  accessToken: string;
  refreshToken: string;
  locationId: string;
  tenantId: string;
  onTokenRefresh: (tokens: {
    access_token: string;
    refresh_token: string;
  }) => Promise<void>;
}

export class GHLClient {
  private http: AxiosInstance;
  private locationId: string;
  private tenantId: string;
  private config: GHLClientConfig;
  private log = logger.child({ layer: "ghl-client" });

  constructor(config: GHLClientConfig) {
    this.config = config;
    this.locationId = config.locationId;
    this.tenantId = config.tenantId;
    this.log = logger.child({
      layer: "ghl-client",
      tenantId: config.tenantId,
    });

    this.http = axios.create({
      baseURL: GHL_BASE_URL,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Version: GHL_API_VERSION,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.http.interceptors.response.use(
      (res) => {
        this.log.debug(
          { endpoint: res.config.url, status: res.status },
          "GHL API response"
        );
        return res;
      },
      async (error: AxiosError) => {
        const config = error.config as unknown as {
          _retryCount?: number;
          headers: Record<string, string>;
          url?: string;
        };
        if (!config) throw error;

        config._retryCount = config._retryCount || 0;

        // Token expired -> refresh
        if (error.response?.status === 401 && config._retryCount === 0) {
          this.log.info("Access token expired, refreshing");
          try {
            const newTokens = await this.refreshTokens();
            config.headers.Authorization = `Bearer ${newTokens.access_token}`;
            this.http.defaults.headers.Authorization = `Bearer ${newTokens.access_token}`;
            config._retryCount = 1;
            return this.http.request(config);
          } catch (refreshError) {
            this.log.error("Refresh token also expired — marking tenant as disconnected");
            await this.markDisconnected();
            throw refreshError;
          }
        }

        // Rate limited or server error -> exponential backoff
        if (
          (error.response?.status === 429 ||
            (error.response?.status ?? 0) >= 500) &&
          config._retryCount < MAX_RETRIES
        ) {
          const delay = Math.pow(2, config._retryCount) * 1000;
          this.log.warn(
            { endpoint: config.url, status: error.response?.status, delay },
            "Retrying GHL request"
          );
          await new Promise((r) => setTimeout(r, delay));
          config._retryCount += 1;
          return this.http.request(config);
        }

        this.log.error(
          {
            endpoint: config.url,
            status: error.response?.status,
            message: error.message,
            responseBody: JSON.stringify(error.response?.data ?? "").substring(0, 500),
          },
          "GHL API error"
        );
        throw error;
      }
    );
  }

  private async refreshTokens(): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const body = new URLSearchParams({
      client_id: process.env.GHL_CLIENT_ID ?? "",
      client_secret: process.env.GHL_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: this.config.refreshToken,
    });

    const res = await axios.post(
      `${GHL_BASE_URL}/oauth/token`,
      body.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const tokens = {
      access_token: res.data.access_token as string,
      refresh_token: res.data.refresh_token as string,
    };

    await this.config.onTokenRefresh(tokens);
    this.config.accessToken = tokens.access_token;
    this.config.refreshToken = tokens.refresh_token;

    this.log.info("GHL tokens refreshed");
    return tokens;
  }

  private async markDisconnected() {
    try {
      await prisma.tenant.update({
        where: { id: this.tenantId },
        data: {
          ghlAccessToken: null,
          ghlRefreshToken: null,
          ghlTokenExpiry: null,
          syncState: "error",
          lastSyncError: "Token de GHL expirado. Reconecta tu cuenta.",
        },
      });
    } catch (dbError) {
      this.log.error({ error: dbError }, "Failed to mark tenant as disconnected");
    }
  }

  // ==================== CONTACTS ====================

  async getContacts(params?: {
    limit?: number;
    query?: string;
    page?: number;
  }): Promise<GHLContactsResponse> {
    const res = await this.http.get("/contacts/", {
      params: {
        locationId: this.locationId,
        limit: params?.limit ?? 20,
        query: params?.query,
        page: params?.page,
      },
    });
    return res.data as GHLContactsResponse;
  }

  async getContact(id: string): Promise<GHLContact> {
    const res = await this.http.get(`/contacts/${id}`);
    return (res.data as { contact: GHLContact }).contact;
  }

  async createContact(data: CreateContactData): Promise<GHLContact> {
    const res = await this.http.post("/contacts/", {
      ...data,
      locationId: this.locationId,
    });
    return (res.data as { contact: GHLContact }).contact;
  }

  async updateContact(id: string, data: UpdateContactData): Promise<GHLContact> {
    const res = await this.http.put(`/contacts/${id}`, data);
    return (res.data as { contact: GHLContact }).contact;
  }

  async deleteContact(id: string): Promise<void> {
    await this.http.delete(`/contacts/${id}`);
  }

  async searchContacts(query: string): Promise<GHLContact[]> {
    const res = await this.getContacts({ query, limit: 50 });
    return res.contacts;
  }

  async getContactNotes(contactId: string): Promise<GHLNote[]> {
    const res = await this.http.get(`/contacts/${contactId}/notes`);
    return (res.data as GHLNotesResponse).notes;
  }

  async addContactNote(contactId: string, body: string): Promise<GHLNote> {
    const res = await this.http.post(`/contacts/${contactId}/notes`, { body });
    return res.data as GHLNote;
  }

  async addContactTag(contactId: string, tag: string): Promise<void> {
    const contact = await this.getContact(contactId);
    const tags = [...new Set([...(contact.tags || []), tag])];
    await this.updateContact(contactId, { tags });
  }

  async removeContactTag(contactId: string, tag: string): Promise<void> {
    const contact = await this.getContact(contactId);
    const tags = (contact.tags || []).filter((t) => t !== tag);
    await this.updateContact(contactId, { tags });
  }

  // ==================== CONVERSATIONS ====================

  async getConversations(params?: {
    limit?: number;
    page?: number;
  }): Promise<GHLConversationsResponse> {
    const res = await this.http.get("/conversations/search", {
      params: {
        locationId: this.locationId,
        limit: params?.limit ?? 20,
        page: params?.page,
      },
    });
    return res.data as GHLConversationsResponse;
  }

  async getConversation(id: string): Promise<GHLConversation> {
    const res = await this.http.get(`/conversations/${id}`);
    return (res.data as { conversation: GHLConversation }).conversation ?? res.data;
  }

  async getOrCreateConversation(contactId: string): Promise<GHLConversation> {
    // Search for existing conversation for this contact.
    // GHL returns 404 (not empty array) when no conversations exist — catch and fall through.
    try {
      const searchRes = await this.http.get("/conversations/search", {
        params: { locationId: this.locationId, contactId, limit: 1 },
      });
      const data = searchRes.data as GHLConversationsResponse;
      if (data.conversations?.length > 0) {
        this.log.info({ contactId, conversationId: data.conversations[0].id }, "Found existing GHL conversation");
        return data.conversations[0];
      }
    } catch (searchErr) {
      const status = (searchErr as { response?: { status?: number } }).response?.status;
      this.log.info({ contactId, status }, "GHL conversation search returned error — will create new conversation");
    }

    // Create new conversation for this contact
    this.log.info({ contactId }, "Creating new GHL conversation");
    const createRes = await this.http.post("/conversations/", {
      locationId: this.locationId,
      contactId,
    });
    const created = createRes.data as { conversation?: GHLConversation } | GHLConversation;
    return (created as { conversation?: GHLConversation }).conversation ?? (created as GHLConversation);
  }

  async getMessages(conversationId: string): Promise<GHLMessage[]> {
    const res = await this.http.get(`/conversations/${conversationId}/messages`);
    return (res.data as GHLMessagesResponse).messages;
  }

  async sendMessage(data: SendMessageData): Promise<GHLMessage> {
    const res = await this.http.post("/conversations/messages", data);
    return res.data as GHLMessage;
  }

  async updateConversation(id: string, data: { assignedTo?: string }): Promise<GHLConversation> {
    const res = await this.http.put(`/conversations/${id}`, data);
    return (res.data as { conversation: GHLConversation }).conversation ?? res.data;
  }

  // ==================== PIPELINES & OPPORTUNITIES ====================

  async getPipelines(): Promise<GHLPipeline[]> {
    const res = await this.http.get("/opportunities/pipelines", {
      params: { locationId: this.locationId },
    });
    return (res.data as GHLPipelinesResponse).pipelines;
  }

  async getOpportunities(
    pipelineId: string,
    params?: { stageId?: string; limit?: number; startAfterId?: string; page?: number }
  ): Promise<GHLOpportunitiesResponse> {
    const res = await this.http.get("/opportunities/search", {
      params: {
        location_id: this.locationId,
        pipeline_id: pipelineId,
        pipeline_stage_id: params?.stageId,
        limit: params?.limit ?? 20,
        startAfterId: params?.startAfterId,
        page: params?.page,
      },
    });
    // Log meta for pagination debugging
    const data = res.data as GHLOpportunitiesResponse;
    this.log.debug({
      pipelineId,
      returned: data.opportunities?.length,
      metaTotal: data.meta?.total,
      metaNextPage: data.meta?.nextPage,
      metaCurrentPage: data.meta?.currentPage,
    }, "Opportunities response meta");
    return data;
  }

  async getOpportunity(id: string): Promise<GHLOpportunity> {
    const res = await this.http.get(`/opportunities/${id}`);
    return res.data as GHLOpportunity;
  }

  async createOpportunity(data: CreateOpportunityData): Promise<GHLOpportunity> {
    const res = await this.http.post("/opportunities/", {
      ...data,
      locationId: this.locationId,
    });
    return res.data as GHLOpportunity;
  }

  async updateOpportunity(id: string, data: UpdateOpportunityData): Promise<GHLOpportunity> {
    const res = await this.http.put(`/opportunities/${id}`, {
      pipelineStageId: data.stageId,
      status: data.status,
      monetaryValue: data.monetaryValue,
      name: data.name,
      assignedTo: data.assignedTo,
    });
    return res.data as GHLOpportunity;
  }

  // ==================== CUSTOM FIELDS ====================

  async getCustomFields(): Promise<GHLCustomField[]> {
    const res = await this.http.get("/locations/customFields", {
      params: { locationId: this.locationId },
    });
    return (res.data as GHLCustomFieldsResponse).customFields;
  }

  async createCustomField(data: {
    name: string;
    fieldKey: string;
    dataType: string;
  }): Promise<GHLCustomField> {
    const res = await this.http.post("/locations/customFields", {
      ...data,
      locationId: this.locationId,
    });
    return res.data as GHLCustomField;
  }

  // ==================== LOCATION ====================

  async getLocation(): Promise<GHLLocation> {
    const res = await this.http.get(`/locations/${this.locationId}`);
    return (res.data as GHLLocationResponse).location;
  }

  // ==================== CALENDARS ====================

  async getCalendars(): Promise<GHLCalendar[]> {
    const res = await this.http.get("/calendars/", {
      params: { locationId: this.locationId },
    });
    return (res.data as GHLCalendarsResponse).calendars;
  }

  async getAppointments(calendarId: string): Promise<GHLAppointment[]> {
    const res = await this.http.get(`/calendars/${calendarId}/events`);
    return (res.data as GHLAppointmentsResponse).events;
  }

  // ==================== FORMS ====================

  async getForms(): Promise<GHLForm[]> {
    const res = await this.http.get("/forms/", {
      params: { locationId: this.locationId },
    });
    return (res.data as GHLFormsResponse).forms;
  }

  async getFormSubmissions(formId: string): Promise<GHLFormSubmission[]> {
    const res = await this.http.get("/forms/submissions", {
      params: { formId, locationId: this.locationId },
    });
    return (res.data as GHLFormSubmissionsResponse).submissions;
  }

  // ==================== TAGS ====================

  async getTags(): Promise<GHLTag[]> {
    const res = await this.http.get("/locations/tags", {
      params: { locationId: this.locationId },
    });
    return (res.data as GHLTagsResponse).tags;
  }

  // ==================== UTILITY ====================

  getLocationId(): string {
    return this.locationId;
  }

  getTenantId(): string {
    return this.tenantId;
  }
}

// ==================== FACTORY ====================

export async function getGHLClient(tenantId: string): Promise<GHLClient> {
  const log = logger.child({ layer: "ghl-factory", tenantId });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    log.error("Tenant not found in DB");
    throw new Error("Tenant not found");
  }

  if (!tenant.ghlAccessToken) {
    log.error("No ghlAccessToken in DB — tenant not connected");
    throw new Error("GHL not connected for this tenant — no access token");
  }

  if (!tenant.ghlLocationId) {
    log.error("No ghlLocationId in DB");
    throw new Error("GHL not connected for this tenant — no location ID");
  }

  let accessToken: string;
  let refreshToken = "";

  try {
    accessToken = decrypt(tenant.ghlAccessToken);
    log.info({ tokenLength: accessToken.length }, "Access token decrypted OK");
  } catch (decryptError) {
    const msg = decryptError instanceof Error ? decryptError.message : String(decryptError);
    log.error({
      error: msg,
      encryptedLength: tenant.ghlAccessToken.length,
      encryptedPrefix: tenant.ghlAccessToken.substring(0, 30),
    }, "FAILED to decrypt access token");
    throw new Error(`Decrypt access token failed: ${msg}`);
  }

  if (tenant.ghlRefreshToken) {
    try {
      refreshToken = decrypt(tenant.ghlRefreshToken);
    } catch (decryptError) {
      log.warn({ error: (decryptError as Error).message }, "Failed to decrypt refresh token — will not be able to auto-refresh");
    }
  }

  return new GHLClient({
    accessToken,
    refreshToken,
    locationId: tenant.ghlLocationId,
    tenantId: tenant.id,
    onTokenRefresh: async (newTokens) => {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          ghlAccessToken: encrypt(newTokens.access_token),
          ghlRefreshToken: encrypt(newTokens.refresh_token),
          ghlTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      log.info("Tokens refreshed and saved to DB");
    },
  });
}
