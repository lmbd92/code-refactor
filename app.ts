// app.ts
import Fastify from "fastify";
class CheckpointManager {
  checkpoints: any[] = [];
  createCheckpoint(unitId: string, status: string, timestamp: Date) {
    this.checkpoints.push({
      id: Math.random().toString(),
      unitId,
      status,
      timestamp: timestamp.toISOString(),
      history: [],
    });
    return this.checkpoints;
  }
  getHistory(unitId: string) {
    return this.checkpoints.filter((c) => c.unitId == unitId);
  }
}
class UnitStatusService {
  units: any[] = [];
  updateUnitStatus(unitId: string, newStatus: string) {
    let unit = this.units.find((u) => u.id == unitId);
    if (!unit) {
      unit = { id: unitId, status: newStatus, checkpoints: [] };
      this.units.push(unit);
    }
    unit.status = newStatus;
    unit.checkpoints.push({ status: newStatus, date: new Date().toString() });
    return unit;
  }
  getUnitsByStatus(status: string) {
    return this.units.filter((u) => u.status == status);
  }
}
class TrackingAPI {
  checkpointManager = new CheckpointManager();
  unitService = new UnitStatusService();
  registerRoutes(app: any) {
    app.post("/checkpoint", async (req: any, reply: any) => {
      const { unitId, status } = req.body;
      const cp = this.checkpointManager.createCheckpoint(
        unitId,
        status,
        new Date()
      );
      this.unitService.updateUnitStatus(unitId, status);
      reply.send(cp);
    });
    app.get("/history", async (req: any, reply: any) => {
      const { unitId } = req.query as any;
      reply.send(this.checkpointManager.getHistory(unitId));
    });
    app.get("/unitsByStatus", async (req: any, reply: any) => {
      const { status } = req.query as any;
      reply.send(this.unitService.getUnitsByStatus(status));
    });
  }
}
const app = Fastify();
const api = new TrackingAPI();
api.registerRoutes(app);
app.listen({ port: 3000 }, (err: any, address: string) => {
  if (err) {
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});
