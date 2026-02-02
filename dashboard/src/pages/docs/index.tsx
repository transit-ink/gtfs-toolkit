import { Book, MapPin, Route } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function DocumentationPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Book className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Documentation</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Learn how to edit routes and stops in the GTFS Dashboard
        </p>
      </div>

      <Separator className="mb-8" />

      {/* Editing Routes Section */}
      <section className="mb-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Route className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Editing Routes</CardTitle>
            </div>
            <CardDescription>
              Learn how to modify route information, shapes, stops, and trip times
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Accessing Route Details</h3>
              <p className="text-muted-foreground mb-4">
                Navigate to the Routes page and click on any route to view its details. The route
                details page provides a comprehensive view of the route including its map, stops,
                and timetable.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Editing Route Information</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Click the "Edit" button in the route details sidebar</li>
                <li>Modify the route fields:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Route ID:</strong> Unique identifier for the route</li>
                    <li><strong>Short Name:</strong> Abbreviated route name (e.g., "1", "A")</li>
                    <li><strong>Long Name:</strong> Full descriptive name of the route</li>
                    <li><strong>Route Type:</strong> Type of transportation (Bus, Rail, etc.)</li>
                  </ul>
                </li>
                <li>Click "Save" to apply changes or "Cancel" to discard</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-3 italic">
                Note: Admin privileges are required to edit routes. You'll see a permission error if
                you don't have the necessary access.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Editing Route Shapes</h3>
              <p className="text-muted-foreground mb-3">
                Routes can have multiple shapes representing different path variations. You can edit
                the shape geometry directly on the map:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Select a shape from the shape selector in the sidebar</li>
                <li>Click "Edit Shape" to enter edit mode</li>
                <li>On the map, you can:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Drag existing shape points to reposition them</li>
                    <li>Click on the shape line to add new points</li>
                    <li>Click on a point to delete it</li>
                  </ul>
                </li>
                <li>Click "Save Shape" to apply changes or "Discard" to revert</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Adding and Removing Stops</h3>
              <p className="text-muted-foreground mb-3">
                You can modify which stops are included in a route:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Click "Edit Stops" to enter stop edit mode</li>
                <li>To add a stop:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Click on any stop marker on the map</li>
                    <li>The stop will be added to the route at the appropriate position</li>
                    <li>Arrival and departure times will be automatically calculated</li>
                  </ul>
                </li>
                <li>To remove a stop:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Click the "Remove" button next to the stop in the sidebar</li>
                    <li>Confirm the removal in the dialog</li>
                    <li>The stop will be removed from all trips on this route</li>
                  </ul>
                </li>
                <li>Click "Save Changes" to apply all stop modifications</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Reordering Stops</h3>
              <p className="text-muted-foreground mb-3">
                You can change the order of stops in a route:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>In the timetable view, use drag-and-drop to reorder stops</li>
                <li>Drag a stop row to a new position</li>
                <li>Click "Save Order" to apply the new sequence</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Editing Trip Times</h3>
              <p className="text-muted-foreground mb-3">
                Modify arrival and departure times for trips:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Click "Edit Timings" in the timetable section</li>
                <li>Click on any time cell to edit it directly</li>
                <li>You can also:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Adjust all times in a row (stop) by a fixed amount</li>
                    <li>Adjust all times in a column (trip) by a fixed amount</li>
                  </ul>
                </li>
                <li>Click "Save Timings" to apply changes or "Discard" to revert</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Editing Stops Section */}
      <section className="mb-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Editing Stops</CardTitle>
            </div>
            <CardDescription>
              Learn how to create, modify, and manage bus stops
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Viewing Stops</h3>
              <p className="text-muted-foreground mb-4">
                Navigate to the Stops page to see all stops on an interactive map. Stops are
                displayed as markers that you can click to view details. Zoom in to see more stops
                in a specific area.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Creating a New Stop</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Click anywhere on the map where you want to create a stop</li>
                <li>Fill in the stop information:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Stop ID:</strong> Unique identifier (auto-generated if not provided)</li>
                    <li><strong>Stop Name:</strong> Display name for the stop</li>
                    <li><strong>Latitude & Longitude:</strong> Automatically set from map click</li>
                    <li><strong>Parent Station:</strong> Optional - link to a parent station</li>
                  </ul>
                </li>
                <li>Click "Create Stop" to save</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Editing Stop Information</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Click on a stop marker to select it</li>
                <li>In the sidebar, click "Edit" next to the stop name</li>
                <li>Modify the stop name</li>
                <li>Click "Save" to apply changes or "Cancel" to discard</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-3 italic">
                Note: Currently, only the stop name can be edited. Other properties like location
                require deleting and recreating the stop.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Setting Parent-Child Relationships</h3>
              <p className="text-muted-foreground mb-3">
                Stops can be organized hierarchically with parent stations and child stops (e.g., a
                station with multiple platforms):
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Select a stop that should be a child stop</li>
                <li>In the sidebar, find the "Parent Station" section</li>
                <li>Click on a parent stop from the map or search for one</li>
                <li>The relationship will be saved automatically</li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Deleting a Stop</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Select the stop you want to delete</li>
                <li>Click the "Delete" button in the sidebar</li>
                <li>Review the warning dialog showing:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>Number of trips that use this stop</li>
                    <li>Impact on routes</li>
                  </ul>
                </li>
                <li>Confirm deletion if you're sure</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-3 italic">
                Warning: Deleting a stop will remove it from all trips. Make sure to update routes
                before deleting stops that are in active use.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Viewing Stop Information</h3>
              <p className="text-muted-foreground mb-3">
                When you select a stop, the sidebar shows:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Stop ID and name</li>
                <li>Coordinates (latitude and longitude)</li>
                <li>Parent station (if applicable)</li>
                <li>Child stops (if this is a parent station)</li>
                <li>Routes that serve this stop</li>
                <li>Number of trips using this stop</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tips Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tips & Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>Save frequently:</strong> Always save your changes before navigating away
                from a page. Unsaved changes will be lost.
              </li>
              <li>
                <strong>Check permissions:</strong> Some operations require admin privileges. If you
                see permission errors, contact your administrator.
              </li>
              <li>
                <strong>Review before deleting:</strong> Always review the impact of deleting stops
                or modifying routes, as these changes affect trip schedules.
              </li>
              <li>
                <strong>Use the map:</strong> The interactive map is the best way to visualize and
                edit spatial data like routes and stops.
              </li>
              <li>
                <strong>Test changes:</strong> After making significant changes, verify that trips
                and schedules still work correctly.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
