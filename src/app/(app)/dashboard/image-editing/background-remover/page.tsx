
import { BackgroundRemover } from '../../../../../components/background-remover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../../components/ui/card';

export default function BackgroundRemoverPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Image Background Remover</CardTitle>
                <CardDescription>
                    Upload an image and let AI automatically remove the background for you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <BackgroundRemover />
            </CardContent>
        </Card>
    );
}
