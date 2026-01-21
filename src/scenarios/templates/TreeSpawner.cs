// ============================================
// ORBRYA SCENARIO: Forest Optimization
// ============================================
// 
// 🔴 PROBLEM: The AI spawned infinite trees!
// The frame rate has dropped and the scene is laggy.
// 
// 🎯 YOUR TASK: Fix the while loop condition
// to limit the number of trees spawned.
//
// 💡 HINT: Replace "true" with a condition like:
//    treeCount < 50
// ============================================

using Orbrya.Engine;

public class TreeSpawner : ScenarioBase
{
    private int treeCount = 0;
    private ForestScene scene;

    public override void Initialize()
    {
        scene = GetScene<ForestScene>();
        treeCount = 0;
    }

    public void SpawnTrees()
    {
        // ╔════════════════════════════════════════════╗
        // ║  🔧 FIX THE BUG BELOW!                     ║
        // ║  Change the while condition to stop        ║
        // ║  at a reasonable number of trees.          ║
        // ╚════════════════════════════════════════════╝
        
        while (true)  // ← ❌ BUG: infinite loop!
        {
            scene.SpawnTree();
            treeCount++;
        }
        
        // ════════════════════════════════════════════
        // ✅ EXAMPLE FIX: while (treeCount < 50)
        // ════════════════════════════════════════════
    }

    public override void OnComplete()
    {
        Debug.Log($"Spawned {treeCount} trees");
        Profiler.ShowFPS();
    }
}
