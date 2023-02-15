import { groupRoutesSchemas } from "./group.api.schema";
import { Group } from ".";
import { Api } from "api";
import { GroupSnapshot } from "topics/group-snapshot";

const setDataUrlAndChangeProperties = (api: Api, group: Group) => ({
  ...group,
  properties: {
    ...group.properties,
    tierDistribution: group.properties?.valueDistribution,
  },
  dataUrl: api.groupStore.dataUrl(group),
});

const setDataAndTimestampFromSnapshot = (
  group: Group,
  snapshot: GroupSnapshot
) => ({
  ...group,
  timestamp: snapshot.timestamp,
  data: snapshot.data,
  resolvedIdentifierData: snapshot.resolvedIdentifierData,
});

const routes = async (api: Api) => {
  api.get(
    "/groups/:groupName",
    { schema: groupRoutesSchemas.list },
    async (req) => {
      const group = (
        await api.groupStore.search({
          groupName: req.params.groupName,
          latest: true,
        })
      )[0];

      let snapshots: GroupSnapshot[] = [];

      if (req.query.timestamp) {
        snapshots = await api.groupSnapshotStore.search({
          groupId: group ? group.id : "0",
          timestamp: req.query.timestamp,
        });
      }

      if (req.query.latest === true) {
        snapshots = [
          await api.groupSnapshotStore.latestById(group ? group.id : "0"),
        ];
      }

      if (!req.query.timestamp && !req.query.latest) {
        snapshots = await api.groupSnapshotStore.allById(
          group ? group.id : "0"
        );
      }

      return {
        items: snapshots.map((snapshot) => {
          return setDataUrlAndChangeProperties(
            api,
            setDataAndTimestampFromSnapshot(group, snapshot)
          );
        }),
      };
    }
  );

  api.get(
    "/groups/latests",
    { schema: groupRoutesSchemas.latests },
    async () => {
      const groups = await api.groupStore.latests();

      const items = [];
      for (const group of Object.values(groups)) {
        const snapshot = await api.groupSnapshotStore.latestById(group.id);
        items.push(
          setDataUrlAndChangeProperties(
            api,
            setDataAndTimestampFromSnapshot(group, snapshot)
          )
        );
      }

      return {
        items,
      };
    }
  );
};

export default routes;
